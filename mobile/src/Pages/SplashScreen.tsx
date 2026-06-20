import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, FONT } from '../theme/index';



// ─── Component ────────────────────────────────────────────────────────────────
export default function SplashScreen({ navigation }: any) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const timer = setTimeout(() => {
      if (user) {
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      } else {
        navigation.replace('Login');
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigation, user, loading]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd, COLORS.primaryDark]}
        style={styles.gradient}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      >
        <View style={styles.content}>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image 
                source={require('../../assets/stivologo.png')}
                style={{ width: '100%', height: '100%', borderRadius: 28 }}
                resizeMode="cover"
            />
          </View>

          {/* App name */}
          <Text style={styles.appName}>Stivo</Text>
          <Text style={styles.tagline}>Smart Hostel Management</Text>

          {/* Animated dots */}
          <View style={styles.dotsContainer}>
            {[1, 0.55, 0.3].map((opacity, i) => (
              <View
                key={i}
                style={[styles.dot, { opacity }]}
              />
            ))}
          </View>

        </View>

        {/* Footer */}
        <Text style={styles.footer}>Powered by Stivo</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 110,
    height: 110,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    // Glass effect border
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  appName: {
    fontSize: FONT.xxxl + 4,
    fontWeight: FONT.black,
    color: '#FFFFFF',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: FONT.md,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: FONT.medium,
    letterSpacing: 0.5,
    marginBottom: 60,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  footer: {
    textAlign: 'center',
    fontSize: FONT.sm,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: FONT.medium,
  },
});
