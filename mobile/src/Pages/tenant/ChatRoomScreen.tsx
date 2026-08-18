/**
 * ⚠️ DISABLED — tenant chat is switched off.
 *
 * This screen is no longer registered in AppNavigator, so it is unreachable and
 * out of the bundle. It never worked: ChatProvider was unmounted on 2026-06-30,
 * so useChat() below returned the default no-op context and this room always
 * rendered empty. See contexts/ChatContext.tsx for the full history and the
 * re-enable checklist. Code left intact, not deleted.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, StatusBar,
  Dimensions, Animated, FlatList, Keyboard
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft, MoreVertical, Send,
  Paperclip, Smile, CheckCheck, Mic, Camera, MessageCircle
} from 'lucide-react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useChat, Message } from '../../../contexts/ChatContext';
import { useNavigation } from '@react-navigation/native';
import { EmojiKeyboard } from 'rn-emoji-keyboard';

const { width: W } = Dimensions.get('window');
const BLUE = '#2245D4';
const WHITE = '#FFFFFF';
const WA_BG = '#EFE6DD';
const MY_BUBBLE = '#E3F2FD';

const MEMBER_COLORS: Record<string, string> = {
  Durgarao: '#2245D4',
  Rahul: '#F97316',
  Anil: '#16A34A',
  Surya: '#A855F7',
  Priya: '#EC4899',
  Admin: '#EF4444',
  You: '#2245D4',
};

function getColor(name: string) {
  return MEMBER_COLORS[name] ?? '#64748B';
}

function Bubble({ msg, showName }: { msg: Message; showName: boolean }) {
  const { user } = useAuth();
  const mine = msg.sender_id === user?.id;

  const formattedTime = new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const senderName = mine ? 'You' : `${msg.first_name || ''} ${msg.last_name || ''}`.trim();

  if (mine) {
    return (
      <View style={[styles.row, styles.rowRight]}>
        <View style={styles.bubbleMe}>
          <Text style={styles.textBase}>{msg.message}</Text>
          <View style={styles.metaMe}>
            <Text style={styles.timeText}>{formattedTime}</Text>
            {msg.read_at ? (
              <CheckCheck size={16} color="#53BDEB" />
            ) : (
              <CheckCheck size={16} color="#94A3B8" />
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, styles.rowLeft]}>
      <View style={styles.bubbleThem}>
        {showName && (
          <Text style={[styles.senderName, { color: getColor(senderName) }]}>
            {senderName}
          </Text>
        )}
        <Text style={styles.textBase}>{msg.message}</Text>
        <View style={styles.metaThem}>
          <Text style={styles.timeText}>{formattedTime}</Text>
        </View>
      </View>
    </View>
  );
}

export default function ChatRoomScreen() {
  const { user } = useAuth();
  const { messages, sendMessage, isConnected, sendTyping, stopTyping } = useChat();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    navigation.goBack();
  };

  // Content handlers are moved below into renderContent()

  if (!user?.room_id) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
        <StatusBar barStyle="light-content" backgroundColor={BLUE} />

        {/* Header */}
        <View style={{ backgroundColor: BLUE }}>
          <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
            <View style={styles.header}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity onPress={handleBack} style={{ padding: 4 }}>
                  <ArrowLeft size={24} color={WHITE} />
                </TouchableOpacity>
                <View>
                  <Text style={styles.headerTitle}>Messages</Text>
                  <Text style={styles.headerSub}>Not Assigned</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* Empty State */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: 'rgba(34, 69, 212, 0.1)',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: 20
          }}>
            <MessageCircle size={40} color={BLUE} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>No Room Assigned</Text>
          <Text style={{ fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22 }}>
            You are currently not assigned to any room. You will automatically join your room's group chat once assigned.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: WA_BG }}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      {/* Header - Always fixed at the top */}
      <View style={{ backgroundColor: BLUE }}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity onPress={handleBack} style={{ padding: 4 }}>
                <ArrowLeft size={24} color={WHITE} />
              </TouchableOpacity>
              <View>
                <Text style={styles.headerTitle}>Room {user.room_number || 'Chat'}</Text>
                <Text style={styles.headerSub}>
                  {isConnected ? 'Online' : 'Connecting...'}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <TouchableOpacity>
                <MoreVertical size={24} color={WHITE} />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Main Content Area */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 48 : 0}
      >
        <ChatContent />
      </KeyboardAvoidingView>
    </View>
  );
}

// Extract content to avoid duplication
const ChatContent = () => {
  const { messages, sendMessage, sendTyping, stopTyping } = useChat();
  const [text, setText] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const flatRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const scale = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardVisible(true);
      setIsEmojiPickerOpen(false); // Close emoji picker when OS keyboard opens
      if (Platform.OS === 'android') {
        setKeyboardHeight(e.endCoordinates.height);
      }
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      if (Platform.OS === 'android') {
        setKeyboardHeight(0);
      }
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSend = () => {
    const t = text.trim();
    if (!t) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    sendMessage(t);
    setText('');
    stopTyping();
  };

  const handleTextChange = (val: string) => {
    setText(val);
    if (val.length > 0) sendTyping();
    else stopTyping();
  };

  const handleEmojiSelect = (emojiObject: any) => {
    const emojiStr = emojiObject.code || emojiObject.emoji || emojiObject;
    setText(prev => {
      const newText = prev + emojiStr;
      if (newText.length > 0) sendTyping();
      else stopTyping();
      return newText;
    });
  };

  // Base padding when keyboard is CLOSED
  const closedPadding = Math.max(insets.bottom, 55);

  // Base padding when keyboard is OPEN
  const openPadding = Platform.OS === 'ios' ? 40 : (keyboardHeight + 50);

  const bottomPadding = keyboardVisible 
    ? openPadding 
    : (isEmojiPickerOpen ? 12 : closedPadding);

  return (
    <>
      <FlatList
        ref={flatRef}
        data={messages}
        style={{ flex: 1 }}
        keyExtractor={(item) => item.id.toString()}
        inverted
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1, justifyContent: 'flex-end' }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const nextItem = messages[index + 1];
          const showName = !nextItem || nextItem.sender_id !== item.sender_id;
          return <Bubble msg={item} showName={showName} />;
        }}
      />
      <View style={[styles.inputWrap, { paddingBottom: bottomPadding }]}>
        <View style={styles.inputBox}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => {
            if (isEmojiPickerOpen) {
              setIsEmojiPickerOpen(false);
              inputRef.current?.focus();
            } else {
              if (keyboardVisible) Keyboard.dismiss();
              // Short delay to let OS keyboard start hiding before showing emoji board
              setTimeout(() => setIsEmojiPickerOpen(true), 50);
            }
          }}>
            <Smile size={24} color={isEmojiPickerOpen ? "#10B981" : "#64748B"} />
          </TouchableOpacity>
          <TextInput
            ref={inputRef}
            style={styles.input}
            onFocus={() => setIsEmojiPickerOpen(false)}
            placeholder="Message"
            placeholderTextColor="#94A3B8"
            value={text}
            onChangeText={handleTextChange}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity style={styles.iconBtn}>
            <Paperclip size={22} color="#64748B" />
          </TouchableOpacity>
          {!text && (
            <TouchableOpacity style={[styles.iconBtn, { marginLeft: 4 }]}>
              <Camera size={22} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>

        <Animated.View style={{ transform: [{ scale }] }}>
          <TouchableOpacity style={styles.sendBtn} onPress={text ? handleSend : () => { }}>
            {text ? (
              <Send size={20} color={WHITE} style={{ marginLeft: 2 }} />
            ) : (
              <Mic size={22} color={WHITE} />
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      {isEmojiPickerOpen && (
        <View style={{ height: keyboardHeight > 0 ? (openPadding - 12) : 300, backgroundColor: '#FFFFFF' }}>
          <EmojiKeyboard
            onEmojiSelected={handleEmojiSelect}
            enableSearchBar={true}
            categoryPosition="top"
          />
        </View>
      )}
    </>
  );
}


const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  headerTitle: { color: WHITE, fontSize: 18, fontWeight: '700' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 8, paddingVertical: 8,
  },
  inputBox: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: WHITE, borderRadius: 25, paddingHorizontal: 12, paddingVertical: 8,
    minHeight: 50, maxHeight: 120,
  },
  input: {
    flex: 1, fontSize: 16, color: '#0F172A',
    paddingTop: 4, paddingBottom: 4,
    marginHorizontal: 8,
  },
  iconBtn: { padding: 4, justifyContent: 'center', alignItems: 'center', height: 34 },
  sendBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#10B981', // WhatsApp green
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 2, elevation: 2,
  },

  row: { flexDirection: 'row', marginBottom: 2 },
  rowLeft: { justifyContent: 'flex-start', paddingRight: 60 },
  rowRight: { justifyContent: 'flex-end', paddingLeft: 60 },

  bubbleMe: {
    backgroundColor: MY_BUBBLE, borderRadius: 16, borderTopRightRadius: 4,
    paddingHorizontal: 12, paddingVertical: 8, minWidth: 80,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 1, elevation: 1,
  },
  bubbleThem: {
    backgroundColor: WHITE, borderRadius: 16, borderTopLeftRadius: 4,
    paddingHorizontal: 12, paddingVertical: 8, minWidth: 80,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 1, elevation: 1,
  },
  senderName: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  textBase: { fontSize: 15, color: '#0F172A', lineHeight: 20 },

  metaMe: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 },
  metaThem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  timeText: { fontSize: 11, color: '#94A3B8' },
});
