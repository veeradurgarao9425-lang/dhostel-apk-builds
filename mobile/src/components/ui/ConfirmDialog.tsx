import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Pressable,
} from 'react-native';
import { COLORS, FONT, RADIUS, SPACING, SHADOW } from '../../theme/index';

// ─── Props ────────────────────────────────────────────────────────────────────
interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean; // red confirm button
  loading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
  loading = false,
}) => {
  const [shouldRender, setShouldRender] = useState(visible);
  const translateY = useRef(new Animated.Value(300)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 300, duration: 160, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) setShouldRender(false);
      });
    }
  }, [visible]);

  if (!shouldRender) return null;

  return (
    <Modal
      transparent
      visible={visible || shouldRender}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Animated.View style={[StyleSheet.absoluteFillObject, styles.backdrop, { opacity }]}>
          <Pressable style={{ flex: 1 }} onPress={onCancel} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Icon */}
          <View style={[styles.iconCircle, { backgroundColor: destructive ? COLORS.errorLight : COLORS.primaryLight }]}>
            <Text style={styles.iconText}>{destructive ? '🗑️' : '❓'}</Text>
          </View>

          {/* Text */}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn]}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btn,
                styles.confirmBtn,
                { backgroundColor: destructive ? COLORS.error : COLORS.primary },
                loading && styles.loadingBtn,
              ]}
              onPress={onConfirm}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmText}>
                {loading ? 'Please wait…' : confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxxl,
    alignItems: 'center',
    ...SHADOW.sheet,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    fontSize: FONT.lg,
    fontWeight: FONT.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  message: {
    fontSize: FONT.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xxl,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  btn: {
    flex: 1,
    paddingVertical: SPACING.md + 2,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
  },
  loadingBtn: {
    opacity: 0.65,
  },
  cancelText: {
    fontSize: FONT.base,
    fontWeight: FONT.semiBold,
    color: COLORS.textSecondary,
  },
  confirmText: {
    fontSize: FONT.base,
    fontWeight: FONT.semiBold,
    color: COLORS.white,
  },
});

export default ConfirmDialog;
