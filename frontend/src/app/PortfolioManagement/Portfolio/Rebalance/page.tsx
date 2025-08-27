"use client";
import React from "react";
export default function PortfolioRebalanceWrapper() {
	if (typeof window !== "undefined") {
		window.location.replace('/PortfolioManagement/Dashboard');
	}
	return null;
}

