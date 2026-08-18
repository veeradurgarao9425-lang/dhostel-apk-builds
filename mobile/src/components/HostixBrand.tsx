import React from 'react';
import { View, Text, TextStyle, ViewStyle } from 'react-native';

interface HostixBrandProps {
    fontSize?: number;
    letterSpacing?: number;
    lightTheme?: boolean; // if true: main text is dark slate, highlight is signature gold/amber
    subtitle?: string;
    style?: ViewStyle;
    textStyle?: TextStyle;
    uppercase?: boolean;
}

export const HostixBrand: React.FC<HostixBrandProps> = ({
    fontSize = 22,
    letterSpacing = 1,
    lightTheme = false,
    subtitle,
    style,
    textStyle,
    uppercase = false,
}) => {
    const mainColor = lightTheme ? '#0F172A' : '#FFFFFF';
    const highlightColor = '#F59E0B'; // Amber-Gold signature highlight for 'ix' / 'IX'

    const mainText = uppercase ? 'HOST' : 'Host';
    const highlightText = uppercase ? 'IX' : 'ix';

    return (
        <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
            <Text style={[{ fontSize, fontWeight: '900', color: mainColor, letterSpacing }, textStyle]}>
                {mainText}
                <Text style={{ color: highlightColor }}>{highlightText}</Text>
            </Text>
            {subtitle && (
                <Text style={{ fontSize: fontSize * 0.55, fontWeight: '600', color: lightTheme ? '#64748B' : 'rgba(255,255,255,0.8)', marginLeft: 6 }}>
                    {subtitle}
                </Text>
            )}
        </View>
    );
};

export default HostixBrand;
