"use client";

import React from "react";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    AreaChart,
    Area,
} from "recharts";
import dayjs from "dayjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";

interface MarketingChartsProps {
    stageData: { name: string; value: number; color: string }[];
    sourceData: { name: string; total: number; sales: number }[];
    trendData: { date: string; count: number }[];
    loading?: boolean;
}

const STAGE_COLORS: Record<string, string> = {
    Prospect: "hsl(var(--chart-1))",
    Target: "hsl(var(--chart-2))",
    DNP: "hsl(var(--chart-3))",
    "Conversation Done": "hsl(var(--chart-4))",
    "Out of TG": "hsl(var(--chart-5))",
    "Sale Done": "rgb(34 197 94)",
};

const chartConfig = {
    total: {
        label: "Total Leads",
        color: "hsl(var(--chart-1))",
    },
    sales: {
        label: "Sale Done",
        color: "rgb(34 197 94)",
    },
    count: {
        label: "Leads",
        color: "hsl(var(--chart-1))",
    },
} satisfies ChartConfig;

export function MarketingCharts({
    stageData,
    sourceData,
    trendData,
    loading,
}: MarketingChartsProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="md:col-span-1 h-[300px] animate-pulse">
                    <CardHeader><div className="h-4 w-3/4 bg-muted rounded" /></CardHeader>
                    <CardContent className="flex items-center justify-center h-[200px]"><div className="h-24 w-24 rounded-full bg-muted" /></CardContent>
                </Card>
                <Card className="md:col-span-3 h-[300px] animate-pulse">
                    <CardHeader><div className="h-4 w-3/4 bg-muted rounded" /></CardHeader>
                    <CardContent className="h-[200px] bg-muted m-4 rounded" />
                </Card>
                <Card className="col-span-full h-[300px] animate-pulse">
                    <CardHeader><div className="h-4 w-3/4 bg-muted rounded" /></CardHeader>
                    <CardContent className="h-[200px] bg-muted m-4 rounded" />
                </Card>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Lead Stages Pie Chart - 1/4 width */}
            <Card className="flex flex-col md:col-span-1">
                <CardHeader className="pb-0">
                    <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Lead Stages</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 pb-0">
                    <ChartContainer
                        config={chartConfig}
                        className="mx-auto aspect-square max-h-[160px]"
                    >
                        <PieChart>
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent hideLabel />}
                            />
                            <Pie
                                data={stageData}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={40}
                                strokeWidth={5}
                            >
                                {stageData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ChartContainer>
                    <div className="mt-2 space-y-1 pb-4">
                        {stageData.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-[10px]">
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-muted-foreground truncate max-w-[80px]">{item.name}</span>
                                </div>
                                <span className="font-bold">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Leads by Source Comparison Chart - 3/4 width */}
            <Card className="flex flex-col md:col-span-3">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Source Performance: Leads vs Sales</CardTitle>
                    <div className="flex gap-4 text-[10px]">
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-[hsl(var(--chart-1))]" />
                            <span>Total Leads</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-[rgb(34,197,94)]" />
                            <span>Sale Done</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 pb-0">
                    <ChartContainer config={chartConfig} className="min-h-[160px] max-h-[180px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={sourceData.slice(0, 15)} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    fontSize={9}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={0}
                                    angle={-45}
                                    textAnchor="end"
                                    height={60}
                                />
                                <YAxis fontSize={9} tickLine={false} axisLine={false} />
                                <Tooltip
                                    content={<ChartTooltipContent />}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="total"
                                    name="Total Leads"
                                    stroke="hsl(var(--chart-1))"
                                    fill="hsl(var(--chart-1))"
                                    fillOpacity={0.1}
                                    strokeWidth={2}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="sales"
                                    name="Sale Done"
                                    stroke="rgb(34, 197, 94)"
                                    fill="rgb(34, 197, 94)"
                                    fillOpacity={0.2}
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>

            {/* Leads Trend Area Chart - Full Width Row */}
            <Card className="flex flex-col col-span-full">
                <CardHeader className="items-center pb-0">
                    <CardTitle className="text-xs font-bold uppercase text-muted-foreground">Leads Trend Over Time</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 pb-0">
                    <ChartContainer config={chartConfig} className="min-h-[120px] max-h-[140px] w-full">
                        <AreaChart
                            data={trendData}
                            margin={{
                                left: 12,
                                right: 12,
                                top: 10,
                                bottom: 10
                            }}
                        >
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                fontSize={10}
                                tickFormatter={(value) => dayjs(value).format("DD MMM")}
                            />
                            <YAxis fontSize={10} tickLine={false} axisLine={false} />
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent hideLabel />}
                            />
                            <Area
                                dataKey="count"
                                type="monotone"
                                fill="hsl(var(--chart-1))"
                                fillOpacity={0.3}
                                stroke="hsl(var(--chart-1))"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    );
}
