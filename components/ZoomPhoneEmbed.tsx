"use client";

import React, { useState, useEffect, useRef } from "react";
import { Phone, X, Minimize2, Maximize2, PhoneCall, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ZoomPhoneEmbedProps {
    onIncomingCall?: (data: any) => void;
    onCallEnd?: (data: any) => void;
    onConnect?: (data: any) => void;
    callerEmail?: string;
}

export interface ZoomPhoneEmbedHandle {
    dial: (phoneNumber: string) => void;
}

const isMobileDevice = () => {
    if (typeof navigator === "undefined") return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
};

export const ZoomPhoneEmbed = React.forwardRef<ZoomPhoneEmbedHandle, ZoomPhoneEmbedProps>(({
    onIncomingCall,
    onCallEnd,
    onConnect,
    callerEmail,
}, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [lastDialedNumber, setLastDialedNumber] = useState<string>("");
    const [callStatus, setCallStatus] = useState<string>("");
    const [embedUrl, setEmbedUrl] = useState("");
    const [iframeLoaded, setIframeLoaded] = useState(false);

    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        setEmbedUrl(`https://applications.zoom.us/integration/phone/embeddablephone/home?origin=${window.location.origin}`);
    }, []);

    // Listen for Zoom Phone events from the Smart Embed
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const { type, data } = event.data || {};
            if (!type || typeof type !== 'string') return;

            if (type.startsWith('zp-')) {
                console.log(`[Zoom Phone Event] ${type}:`, data);
            }

            switch (type) {
                case "zp-call-ringing-event":
                    if (onIncomingCall) onIncomingCall(data);
                    setCallStatus("Ringing...");
                    break;
                case "zp-call-connected-event":
                    if (onConnect) onConnect(data);
                    setCallStatus("Connected");
                    break;
                case "zp-call-ended-event":
                    if (onCallEnd) onCallEnd(data);
                    setCallStatus("");
                    setLastDialedNumber("");
                    break;
                case "zp-init-success-event":
                    setIframeLoaded(true);
                    break;
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [onIncomingCall, onCallEnd, onConnect]);

    const dialNumber = async (phoneNumber: string) => {
        if (!phoneNumber) return;

        // 1. Clean the number - keep only digits and '+'
        let cleanNumber = phoneNumber.replace(/[^\d+]/g, "");

        // 2. Intelligent Formatting
        if (!cleanNumber.startsWith('+')) {
            // Case A: 12 digits starting with 91 -> India
            if (cleanNumber.length === 12 && cleanNumber.startsWith('91')) {
                cleanNumber = '+' + cleanNumber;
            }
            // Case B: 11 digits starting with 1 -> US/Canada
            else if (cleanNumber.length === 11 && cleanNumber.startsWith('1')) {
                cleanNumber = '+' + cleanNumber;
            }
            // Case C: 10 digits -> Assume US/India based on common CRM usage
            // Most Zoom accounts (like the user's US-based caller ID) 
            // require +1 for 10-digit US numbers if the region isn't perfect.
            else if (cleanNumber.length === 10) {
                // Prepend +1 for US routing (per screenshot numbers)
                cleanNumber = '+1' + cleanNumber;
            }
        }

        setLastDialedNumber(cleanNumber);

        // On mobile, use native dialer
        if (isMobileDevice()) {
            window.location.href = `tel:${cleanNumber}`;
            return;
        }

        // UI Feedback
        setIsOpen(true);
        setIsMinimized(false);
        setCallStatus(`Dialing ${cleanNumber}...`);

        // Prioritize internal postMessage to the Zoom Smart Embed
        // This is much more stable and keeps the call within the widget
        if (iframeRef.current && iframeLoaded) {
            try {
                iframeRef.current.contentWindow?.postMessage({
                    type: "zp-make-call",
                    data: { number: cleanNumber }
                }, "https://applications.zoom.us");
            } catch (err) {
                console.error("postMessage failed:", err);
            }
        }

        // Fallback or Force-initiate via system protocol
        // We use a single, direct trigger. No double-calling.
        window.location.href = `zoomphonecall:${cleanNumber}`;

        // Clear status after some time
        setTimeout(() => {
            setCallStatus("");
        }, 5000);
    };

    React.useImperativeHandle(ref, () => ({
        dial: dialNumber
    }));

    const toggleOpen = () => {
        setIsOpen(!isOpen);
        setIsMinimized(false);
    };

    const toggleMinimize = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMinimized(!isMinimized);
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 pointer-events-none">
            {/* Zoom Phone Widget */}
            <div
                className={cn(
                    "transition-all duration-300 ease-in-out overflow-hidden bg-white shadow-2xl rounded-xl border border-gray-200 pointer-events-auto",
                    isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none",
                    isMinimized ? "w-64 h-16" : "w-[375px] h-[600px]"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100 h-12">
                    <span className="text-sm font-medium text-gray-700">Zoom Phone</span>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-gray-700" onClick={toggleMinimize}>
                            {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-red-500" onClick={() => { setIsOpen(false); setCallStatus(""); }}>
                            <X size={14} />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className={cn("relative w-full h-full", isMinimized && "hidden")}>
                    {/* Smart Embed iframe - for visual display */}
                    {embedUrl && (
                        <iframe
                            ref={iframeRef}
                            src={embedUrl}
                            className="w-full h-[calc(100%-3rem)] border-none"
                            allow="microphone; camera; clipboard-write; autoplay; display-capture"
                            onLoad={() => setIframeLoaded(true)}
                        />
                    )}

                    {!iframeLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm bg-white">
                            Loading Zoom Phone...
                        </div>
                    )}

                    {/* Call Status Banner */}
                    {callStatus && (
                        <div className="absolute bottom-0 left-0 right-0 bg-blue-600 text-white px-4 py-3 text-sm text-center z-20 flex items-center justify-center gap-2">
                            <PhoneCall className="h-4 w-4 animate-pulse" />
                            {callStatus}
                            {lastDialedNumber && (
                                <span className="font-semibold ml-1">{lastDialedNumber}</span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Toggle Button */}
            <Button
                onClick={toggleOpen}
                className={cn(
                    "h-14 w-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110 pointer-events-auto",
                    isOpen ? "bg-red-500 hover:bg-red-600 rotate-90" : "bg-blue-600 hover:bg-blue-700"
                )}
                style={!isOpen ? { animation: "pulse-ring 2s infinite" } : {}}
            >
                {isOpen ? <X className="h-6 w-6 text-white" /> : <Phone className="h-6 w-6 text-white" />}
            </Button>

            <style jsx>{`
                @keyframes pulse-ring {
                    0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(37, 99, 235, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
                }
            `}</style>
        </div>
    );
});

ZoomPhoneEmbed.displayName = "ZoomPhoneEmbed";
