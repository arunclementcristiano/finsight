import React from "react";

export default function PortfolioLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto px-4 py-6">
				{children}
			</div>
		</div>
	);
}