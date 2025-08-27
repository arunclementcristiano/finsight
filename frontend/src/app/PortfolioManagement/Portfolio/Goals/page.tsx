"use client";
import React from "react";
export default function PortfolioGoalsWrapper() {
	if (typeof window !== "undefined") {
		window.location.replace('/PortfolioManagement/Goals');
	}
	return null;
}

