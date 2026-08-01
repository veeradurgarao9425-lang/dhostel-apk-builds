import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../services/api';
import { theme } from '../../../theme/tenantTheme';
import { GrowthCelebrationModal } from '../../../components/tenant/growth/GrowthCelebrationModal';

interface QuizQuestion {
  question_id: number;
  question_type: 'mcq' | 'true_false' | 'fill_blank' | 'vocab';
  question_text: string;
  options: string[] | null;
  correct_answer: string;
}

export function GrowthQuizScreen({ navigation, route }: any) {
  const { levelId, questions } = route.params as { levelId: number; questions: QuizQuestion[] };

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [textAnswer, setTextAnswer] = useState('');
  const [phase, setPhase] = useState<'answering' | 'feedback' | 'submitting' | 'result'>('answering');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const question = questions[index];
  const isLast = index === questions.length - 1;

  const commitAnswer = (value: string) => {
    const updated = { ...answers, [question.question_id]: value };
    setAnswers(updated);
    setSelectedAnswer(value);
    setIsCorrect(value.trim().toLowerCase() === String(question.correct_answer ?? '').trim().toLowerCase());
    setPhase('feedback');
  };

  const advance = async () => {
    setTextAnswer('');
    setSelectedAnswer(null);

    if (!isLast) {
      setIndex((i) => i + 1);
      setPhase('answering');
      return;
    }

    setPhase('submitting');
    try {
      const res = await api.post(`/growth/levels/${levelId}/complete`, { answers });
      if (res.data?.success) {
        setResult(res.data.data);
        setPhase('result');
      }
    } catch {
      setPhase('feedback');
    }
  };

  if (phase === 'submitting') {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.submittingText}>Scoring your answers...</Text>
      </SafeAreaView>
    );
  }

  if (phase === 'result' && result) {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <View style={styles.resultCard}>
          <Ionicons
            name={result.score >= 50 ? 'checkmark-circle' : 'refresh-circle'}
            size={56}
            color={result.score >= 50 ? theme.colors.success : theme.colors.warning}
          />
          <Text style={styles.resultScore}>{result.score}%</Text>
          <Text style={styles.resultSubtitle}>
            {result.correctCount} of {result.totalQuestions} correct
          </Text>
          <TouchableOpacity style={styles.claimButton} onPress={() => setShowCelebration(true)} activeOpacity={0.85}>
            <Text style={styles.claimButtonText}>Claim Your Reward</Text>
          </TouchableOpacity>
        </View>

        <GrowthCelebrationModal
          visible={showCelebration}
          xpEarned={result.xpEarned}
          stars={result.stars}
          leveledUp={result.leveledUp}
          streak={result.streak}
          onContinue={() => navigation.navigate('GrowthHome')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((index + 1) / questions.length) * 100}%` }]} />
        </View>
        <Text style={styles.progressLabel}>{index + 1}/{questions.length}</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.questionType}>{question.question_type.replace('_', ' ').toUpperCase()}</Text>
        <Text style={styles.questionText}>{question.question_text}</Text>

        {question.question_type === 'fill_blank' ? (
          <>
            <View style={styles.fillBlankWrap}>
              <TextInput
                style={[
                  styles.textInput,
                  phase === 'feedback' && (isCorrect ? styles.textInputCorrect : styles.textInputIncorrect),
                ]}
                placeholder="Type your answer..."
                placeholderTextColor={theme.colors.textSubtle}
                value={phase === 'feedback' ? selectedAnswer ?? '' : textAnswer}
                onChangeText={setTextAnswer}
                autoCapitalize="none"
                editable={phase === 'answering'}
              />
              {phase === 'answering' && (
                <TouchableOpacity
                  style={[styles.submitTextButton, !textAnswer.trim() && styles.submitTextButtonDisabled]}
                  disabled={!textAnswer.trim()}
                  onPress={() => commitAnswer(textAnswer.trim())}
                >
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
            {phase === 'feedback' && (
              <FeedbackBanner isCorrect={isCorrect} correctAnswer={question.correct_answer} />
            )}
          </>
        ) : (
          <View style={styles.optionsWrap}>
            {(question.options || []).map((opt) => {
              const isSelected = phase === 'feedback' && selectedAnswer === opt;
              const isCorrectOption = phase === 'feedback' && opt.trim().toLowerCase() === question.correct_answer.trim().toLowerCase();
              return (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.optionButton,
                    isCorrectOption && styles.optionButtonCorrect,
                    isSelected && !isCorrectOption && styles.optionButtonIncorrect,
                  ]}
                  onPress={() => phase === 'answering' && commitAnswer(opt)}
                  activeOpacity={0.8}
                  disabled={phase === 'feedback'}
                >
                  <Text style={styles.optionText}>{opt}</Text>
                  {isCorrectOption && <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />}
                  {isSelected && !isCorrectOption && <Ionicons name="close-circle" size={20} color={theme.colors.danger} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {phase === 'feedback' && question.question_type !== 'fill_blank' && (
          <FeedbackBanner isCorrect={isCorrect} correctAnswer={question.correct_answer} />
        )}

        {phase === 'feedback' && (
          <TouchableOpacity style={styles.continueButton} onPress={advance} activeOpacity={0.9}>
            <Text style={styles.continueButtonText}>{isLast ? 'See Results' : 'Continue'}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function FeedbackBanner({ isCorrect, correctAnswer }: { isCorrect: boolean; correctAnswer: string }) {
  return (
    <View style={[styles.feedbackBanner, isCorrect ? styles.feedbackBannerCorrect : styles.feedbackBannerIncorrect]}>
      <Ionicons
        name={isCorrect ? 'checkmark-circle' : 'information-circle'}
        size={20}
        color={isCorrect ? theme.colors.success : theme.colors.danger}
      />
      <Text style={[styles.feedbackText, { color: isCorrect ? theme.colors.successDark : theme.colors.danger }]}>
        {isCorrect ? 'Correct!' : `Correct answer: ${correctAnswer}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.bg },
  centeredScreen: { flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl },
  submittingText: { ...theme.text.body, marginTop: theme.spacing.md },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
  },
  progressTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: theme.colors.surfaceAlt, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.colors.primary, borderRadius: 4 },
  progressLabel: { ...theme.text.caption, fontWeight: '700' },
  body: { flex: 1, padding: theme.spacing.xl },
  questionType: { ...theme.text.label, color: theme.colors.primary },
  questionText: { fontSize: 20, fontWeight: '800', color: theme.colors.text, marginTop: theme.spacing.md, lineHeight: 28 },
  optionsWrap: { marginTop: theme.spacing['2xl'], gap: theme.spacing.md },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    ...theme.shadow.subtle,
  },
  optionText: { ...theme.text.body, fontWeight: '700', flex: 1 },
  optionButtonCorrect: { borderColor: theme.colors.success, backgroundColor: theme.colors.successSoft },
  optionButtonIncorrect: { borderColor: theme.colors.danger, backgroundColor: theme.colors.dangerSoft },
  fillBlankWrap: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginTop: theme.spacing['2xl'] },
  textInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.text,
  },
  submitTextButton: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  submitTextButtonDisabled: { opacity: 0.4 },
  textInputCorrect: { borderColor: theme.colors.success, backgroundColor: theme.colors.successSoft },
  textInputIncorrect: { borderColor: theme.colors.danger, backgroundColor: theme.colors.dangerSoft },
  feedbackBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  feedbackBannerCorrect: { backgroundColor: theme.colors.successSoft },
  feedbackBannerIncorrect: { backgroundColor: theme.colors.dangerSoft },
  feedbackText: { fontSize: 14, fontWeight: '700', flex: 1 },
  continueButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingVertical: 14,
    marginTop: theme.spacing.xl,
  },
  continueButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  resultCard: { alignItems: 'center', gap: 6 },
  resultScore: { fontSize: 40, fontWeight: '800', color: theme.colors.text, marginTop: theme.spacing.md },
  resultSubtitle: { ...theme.text.body, color: theme.colors.textMuted },
  claimButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingVertical: 14, paddingHorizontal: theme.spacing['3xl'],
    marginTop: theme.spacing['2xl'],
  },
  claimButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
});

export default GrowthQuizScreen;
