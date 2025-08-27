"use client";
import React from "react";
export default function PortfolioPlanWrapper() {
	if (typeof window !== "undefined") {
		window.location.replace('/PortfolioManagement/Plan');
	}
	return null;
}

