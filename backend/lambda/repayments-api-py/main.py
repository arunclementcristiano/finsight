import json
import boto3
import os
from datetime import datetime, date
from decimal import Decimal
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
repayments_table = dynamodb.Table(os.environ.get('REPAYMENTS_TABLE', 'Repayments'))
repayment_history_table = dynamodb.Table(os.environ.get('REPAYMENT_HISTORY_TABLE', 'RepaymentHistory'))

def decimal_default(obj):
    """JSON serializer for Decimal objects"""
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError

def lambda_handler(event, context):
    """Main Lambda handler for repayments API"""
    try:
        http_method = event.get('httpMethod', '')
        path = event.get('path', '')
        user_id = event.get('requestContext', {}).get('authorizer', {}).get('user_id', 'user-123')
        
        logger.info(f"Processing {http_method} {path} for user {user_id}")
        
        # Route requests
        if http_method == 'GET':
            if path == '/repayments':
                return get_repayments(user_id)
            elif path.startswith('/repayments/'):
                repayment_id = path.split('/')[-1]
                return get_repayment(user_id, repayment_id)
            elif path.startswith('/repayments/') and path.endswith('/history'):
                repayment_id = path.split('/')[-2]
                return get_repayment_history(user_id, repayment_id)
        
        elif http_method == 'POST':
            if path == '/repayments':
                body = json.loads(event.get('body', '{}'))
                return create_repayment(user_id, body)
            elif path.startswith('/repayments/') and path.endswith('/prepayment'):
                repayment_id = path.split('/')[-2]
                body = json.loads(event.get('body', '{}'))
                return add_prepayment(user_id, repayment_id, body)
        
        elif http_method == 'PUT':
            if path.startswith('/repayments/'):
                repayment_id = path.split('/')[-1]
                body = json.loads(event.get('body', '{}'))
                return update_repayment(user_id, repayment_id, body)
        
        elif http_method == 'DELETE':
            if path.startswith('/repayments/'):
                repayment_id = path.split('/')[-1]
                return delete_repayment(user_id, repayment_id)
        
        return {
            'statusCode': 404,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            'body': json.dumps({'error': 'Not found'})
        }
    
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Internal server error'})
        }

def get_repayments(user_id):
    """Get all repayments for a user"""
    try:
        response = repayments_table.query(
            KeyConditionExpression='user_id = :user_id',
            ExpressionAttributeValues={':user_id': user_id}
        )
        
        repayments = response.get('Items', [])
        
        # Calculate summary metrics
        total_outstanding = sum(float(r.get('outstanding_balance', 0)) for r in repayments)
        total_emi = sum(float(r.get('emi_amount', 0)) for r in repayments)
        total_repayments = len(repayments)
        
        summary = {
            'total_outstanding': total_outstanding,
            'total_emi': total_emi,
            'total_repayments': total_repayments,
            'repayments': repayments
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(summary, default=decimal_default)
        }
    
    except Exception as e:
        logger.error(f"Error fetching repayments: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Failed to fetch repayments'})
        }

def get_repayment(user_id, repayment_id):
    """Get a specific repayment"""
    try:
        response = repayments_table.get_item(
            Key={'user_id': user_id, 'repayment_id': repayment_id}
        )
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Repayment not found'})
            }
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(response['Item'], default=decimal_default)
        }
    
    except Exception as e:
        logger.error(f"Error fetching repayment: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Failed to fetch repayment'})
        }

def create_repayment(user_id, body):
    """Create a new repayment"""
    try:
        import uuid
        repayment_id = str(uuid.uuid4())
        
        # Calculate derived fields
        principal = float(body.get('principal', 0))
        interest_rate = float(body.get('interest_rate', 0))
        tenure_months = int(body.get('tenure_months', 0))
        emi_amount = float(body.get('emi_amount', 0))
        
        # Calculate outstanding balance (initially same as principal)
        outstanding_balance = principal
        
        repayment = {
            'user_id': user_id,
            'repayment_id': repayment_id,
            'type': body.get('type', ''),
            'institution': body.get('institution', ''),
            'principal': Decimal(str(principal)),
            'interest_rate': Decimal(str(interest_rate)),
            'emi_amount': Decimal(str(emi_amount)),
            'tenure_months': tenure_months,
            'outstanding_balance': Decimal(str(outstanding_balance)),
            'start_date': body.get('start_date', ''),
            'due_date': body.get('due_date', ''),
            'status': 'active',
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        repayments_table.put_item(Item=repayment)
        
        return {
            'statusCode': 201,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'repayment_id': repayment_id, 'message': 'Repayment created successfully'})
        }
    
    except Exception as e:
        logger.error(f"Error creating repayment: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Failed to create repayment'})
        }

def update_repayment(user_id, repayment_id, body):
    """Update a repayment"""
    try:
        # Get existing repayment
        response = repayments_table.get_item(
            Key={'user_id': user_id, 'repayment_id': repayment_id}
        )
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Repayment not found'})
            }
        
        existing = response['Item']
        
        # Update fields
        update_expression = "SET updated_at = :updated_at"
        expression_values = {':updated_at': datetime.utcnow().isoformat()}
        
        for field in ['type', 'institution', 'principal', 'interest_rate', 'emi_amount', 'tenure_months', 'outstanding_balance', 'start_date', 'due_date', 'status']:
            if field in body:
                if field in ['principal', 'interest_rate', 'emi_amount', 'outstanding_balance']:
                    expression_values[f':{field}'] = Decimal(str(body[field]))
                else:
                    expression_values[f':{field}'] = body[field]
                update_expression += f", {field} = :{field}"
        
        repayments_table.update_item(
            Key={'user_id': user_id, 'repayment_id': repayment_id},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values
        )
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'message': 'Repayment updated successfully'})
        }
    
    except Exception as e:
        logger.error(f"Error updating repayment: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Failed to update repayment'})
        }

def delete_repayment(user_id, repayment_id):
    """Delete a repayment"""
    try:
        repayments_table.delete_item(
            Key={'user_id': user_id, 'repayment_id': repayment_id}
        )
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'message': 'Repayment deleted successfully'})
        }
    
    except Exception as e:
        logger.error(f"Error deleting repayment: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Failed to delete repayment'})
        }

def get_repayment_history(user_id, repayment_id):
    """Get payment history for a repayment"""
    try:
        response = repayment_history_table.query(
            KeyConditionExpression='user_id = :user_id AND begins_with(repayment_id, :repayment_id)',
            ExpressionAttributeValues={
                ':user_id': user_id,
                ':repayment_id': repayment_id
            }
        )
        
        history = response.get('Items', [])
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(history, default=decimal_default)
        }
    
    except Exception as e:
        logger.error(f"Error fetching repayment history: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Failed to fetch repayment history'})
        }

def add_prepayment(user_id, repayment_id, body):
    """Add a prepayment to repayment history"""
    try:
        import uuid
        history_id = str(uuid.uuid4())
        
        prepayment = {
            'user_id': user_id,
            'repayment_id': repayment_id,
            'history_id': history_id,
            'amount': Decimal(str(body.get('amount', 0))),
            'payment_date': body.get('payment_date', datetime.utcnow().isoformat()),
            'type': 'prepayment',
            'principal_component': Decimal(str(body.get('principal_component', body.get('amount', 0)))),
            'interest_component': Decimal(str(body.get('interest_component', 0))),
            'created_at': datetime.utcnow().isoformat()
        }
        
        repayment_history_table.put_item(Item=prepayment)
        
        # Update outstanding balance in main repayment
        response = repayments_table.get_item(
            Key={'user_id': user_id, 'repayment_id': repayment_id}
        )
        
        if 'Item' in response:
            existing = response['Item']
            new_outstanding = float(existing.get('outstanding_balance', 0)) - float(prepayment['principal_component'])
            
            repayments_table.update_item(
                Key={'user_id': user_id, 'repayment_id': repayment_id},
                UpdateExpression="SET outstanding_balance = :outstanding, updated_at = :updated_at",
                ExpressionAttributeValues={
                    ':outstanding': Decimal(str(max(0, new_outstanding))),
                    ':updated_at': datetime.utcnow().isoformat()
                }
            )
        
        return {
            'statusCode': 201,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'message': 'Prepayment added successfully'})
        }
    
    except Exception as e:
        logger.error(f"Error adding prepayment: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Failed to add prepayment'})
        }