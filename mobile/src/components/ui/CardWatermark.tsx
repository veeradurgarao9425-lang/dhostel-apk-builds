import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';

interface CardWatermarkProps {
    opacity?: number;
    color?: string;
}

export function CardWatermark({ opacity = 0.05, color = '#D4A373' }: CardWatermarkProps) {
    return (
        <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: 24 }]} pointerEvents="none">
            {/* The watermark is positioned strictly in the bottom-right corner */}
            <View style={{ position: 'absolute', right: -10, bottom: -5, opacity }}>
                <Svg width="120" height="90" viewBox="0 0 120 90">
                    <G fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        {/* Background Clouds */}
                        <Path d="M90,30 Q100,20 110,30 Q115,35 110,40 L90,40 Z" />
                        <Path d="M20,45 Q30,35 40,45 Q45,50 40,55 L20,55 Z" opacity="0.6"/>
                        
                        {/* Main Building Left */}
                        <Rect x="25" y="50" width="30" height="40" rx="2" />
                        <Path d="M25,50 L40,35 L55,50" />
                        {/* Windows */}
                        <Rect x="30" y="55" width="6" height="8" rx="1" />
                        <Rect x="44" y="55" width="6" height="8" rx="1" />
                        <Rect x="30" y="68" width="6" height="8" rx="1" />
                        <Rect x="44" y="68" width="6" height="8" rx="1" />

                        {/* Main Building Center (Taller) */}
                        <Rect x="50" y="30" width="40" height="60" rx="2" />
                        <Path d="M48,30 L92,30" />
                        {/* Windows */}
                        <Rect x="56" y="38" width="8" height="8" rx="1" />
                        <Rect x="76" y="38" width="8" height="8" rx="1" />
                        <Rect x="56" y="52" width="8" height="8" rx="1" />
                        <Rect x="76" y="52" width="8" height="8" rx="1" />
                        <Rect x="56" y="66" width="8" height="8" rx="1" />
                        <Rect x="76" y="66" width="8" height="8" rx="1" />
                        
                        {/* Trees/Bushes */}
                        <Path d="M15,90 C15,80 25,80 25,90" />
                        <Path d="M90,90 C90,75 105,75 105,90" />
                        <Path d="M100,90 C100,82 110,82 110,90" />
                    </G>
                </Svg>
            </View>
        </View>
    );
}
