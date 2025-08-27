"use client";
import React from "react";
export default function PortfolioHoldingsWrapper() {
	if (typeof window !== "undefined") {
		window.location.replace('/PortfolioManagement/AddHolding');
	}
	return null;
}

