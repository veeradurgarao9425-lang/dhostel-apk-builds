import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StatusBar, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Star, Send } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const BLUE = '#2245D4';
const WHITE = '#FFFFFF';
const TEXT_DARK = '#1A1A1A';
const TEXT_MID = '#666666';
const BORDER = '#E2E8F0';
const BG = '#F8FAFD';
const STAR_COLOR = '#F59E0B';

const CATEGORIES = [
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'food', label: 'Food Quality' },
  { key: 'staff', label: 'Staff Behavior' },
  { key: 'facilities', label: 'Facilities' },
  { key: 'value', label: 'Value for Money' },
];

function StarRow({ value, onChange, size = 32 }: { value: number; onChange: (v: number) => void; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} activeOpacity={0.7}>
          <Star size={size} color={n <= value ? STAR_COLOR : '#D1D5DB'} fill={n <= value ? STAR_COLOR : 'none'} strokeWidth={1.5} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function RatingScreen({ navigation }: any) {
  const { user } = useAuth();
  const [overall, setOverall] = useState(0);
  const [categories, setCategories] = useState({ cleanliness: 0, food: 0, staff: 0, facilities: 0, value: 0 });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const setCategoryRating = (key: string, val: number) => {
    setCategories(prev => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async () => {
    if (overall === 0) {
      Alert.alert('Rating Required', 'Please select at least an overall star rating.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/ratings', {
        hostel_id: user?.hostel_id,
        rating: overall,
        comment: comment.trim() || undefined,
        categories: Object.values(categories).some(v => v > 0) ? categories : undefined,
      });
      setSubmitted(true);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to submit rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={{ flex: 1, backgroundColor: WHITE, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
          <Star size={40} color="#22C55E" fill="#22C55E" />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '900', color: TEXT_DARK, marginBottom: 12, textAlign: 'center' }}>Thank You!</Text>
        <Text style={{ fontSize: 15, color: TEXT_MID, textAlign: 'center', lineHeight: 24 }}>
          Your review has been submitted. A confirmation has been sent to your email.
        </Text>
        <TouchableOpacity
          style={{ marginTop: 32, backgroundColor: BLUE, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16 }}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: WHITE, fontSize: 16, fontWeight: '700' }}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />
      <View style={{ backgroundColor: BLUE, paddingBottom: 20 }}>
        <SafeAreaView edges={['top']}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, marginLeft: -8 }}>
              <ArrowLeft size={24} color={WHITE} strokeWidth={2.5} />
            </TouchableOpacity>
            <Text style={{ flex: 1, fontSize: 22, fontWeight: '800', color: WHITE, marginLeft: 12 }}>Rate Your Stay</Text>
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

          {/* Overall Rating */}
          <View style={{ backgroundColor: WHITE, borderRadius: 24, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: BORDER, alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT_DARK, marginBottom: 8 }}>Overall Experience</Text>
            <Text style={{ fontSize: 13, color: TEXT_MID, marginBottom: 20 }}>How would you rate your stay overall?</Text>
            <StarRow value={overall} onChange={setOverall} size={40} />
            {overall > 0 && (
              <Text style={{ marginTop: 12, fontSize: 15, fontWeight: '700', color: STAR_COLOR }}>
                {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][overall]}
              </Text>
            )}
          </View>

          {/* Category Ratings */}
          <View style={{ backgroundColor: WHITE, borderRadius: 24, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: BORDER }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: TEXT_DARK, marginBottom: 20 }}>Rate by Category</Text>
            {CATEGORIES.map((cat, i) => (
              <View key={cat.key} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: i < CATEGORIES.length - 1 ? 1 : 0, borderBottomColor: BORDER }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: TEXT_DARK }}>{cat.label}</Text>
                <StarRow value={categories[cat.key as keyof typeof categories]} onChange={(v) => setCategoryRating(cat.key, v)} size={22} />
              </View>
            ))}
          </View>

          {/* Comment */}
          <View style={{ backgroundColor: WHITE, borderRadius: 24, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: BORDER }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: TEXT_DARK, marginBottom: 16 }}>Your Feedback</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 16, padding: 16, fontSize: 15, color: TEXT_DARK, height: 120, textAlignVertical: 'top' }}
              multiline
              value={comment}
              onChangeText={setComment}
              placeholder="Share your experience, suggestions, or concerns..."
              placeholderTextColor="#9CA3AF"
              maxLength={500}
            />
            <Text style={{ textAlign: 'right', fontSize: 12, color: TEXT_MID, marginTop: 8 }}>{comment.length}/500</Text>
          </View>

          <TouchableOpacity
            style={{ height: 56, backgroundColor: BLUE, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, opacity: submitting ? 0.6 : 1 }}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color={WHITE} /> : (
              <>
                <Send size={20} color={WHITE} />
                <Text style={{ color: WHITE, fontSize: 16, fontWeight: '700' }}>Submit Review</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
