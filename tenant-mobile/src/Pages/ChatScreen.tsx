import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, StatusBar,
  Dimensions, Animated, FlatList, Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft, Phone, MoreVertical, Send,
  Paperclip, Smile, CheckCheck, Mic, Camera
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';

const { width: W } = Dimensions.get('window');
const BLUE  = '#2245D4';
const WHITE = '#FFFFFF';
const WA_BG = '#EFE6DD'; 
const MY_BUBBLE = '#E3F2FD'; 

const MEMBER_COLORS: Record<string, string> = {
  Durgarao : '#2245D4',
  Rahul    : '#F97316',
  Anil     : '#16A34A',
  Surya    : '#A855F7',
  Priya    : '#EC4899',
  Admin    : '#EF4444',
  You      : '#2245D4',
};

function getColor(name: string) {
  return MEMBER_COLORS[name] ?? '#64748B';
}

const INITIAL_MSGS = [
  { id: '1', sender: 'Durgarao', mine: false, text: 'Hey everyone! Welcome to the group 🏠', time: '9:00 AM' },
  { id: '2', sender: 'Rahul',    mine: false, text: 'Hey guys! Great to finally have a chat here 👋', time: '9:02 AM' },
  { id: '3', sender: 'Anil',     mine: false, text: 'Anyone know what time the mess opens today?', time: '9:05 AM' },
  { id: '4', sender: 'You',      mine: true,  text: 'I think 8 AM for breakfast and 1 PM for lunch 🍽️', time: '9:06 AM' },
  { id: '5', sender: 'Durgarao', mine: false, text: 'The key is attached on the down stairs 🔑', time: '9:41 AM' },
  { id: '6', sender: 'Surya',    mine: false, text: 'Thanks! WiFi password is hostel@2024 😊', time: '9:45 AM' },
  { id: '7', sender: 'You',      mine: true,  text: 'Perfect, thanks everyone! 🙏', time: '9:46 AM' },
  { id: '8', sender: 'Rahul',    mine: false, text: "Dinner is at 8 PM. Let's go together?", time: '7:30 PM' },
  { id: '9', sender: 'Anil',     mine: false, text: "Sure! I'll be ready by 7:55 👌", time: '7:32 PM' },
];

const AUTO_REPLIES = [
  'Got it! 👍', 'Okay noted 🙌', 'Thanks for the update!',
  'Sure, will do!', 'Understood 😊', '👌', 'Okay!', 'Nice 🔥',
];

function Bubble({ msg, showName }: { msg: any; showName: boolean }) {
  if (msg.mine) {
    return (
      <View style={[styles.row, styles.rowRight]}>
        <View style={styles.bubbleMe}>
          <Text style={styles.textBase}>{msg.text}</Text>
          <View style={styles.metaMe}>
            <Text style={styles.timeText}>{msg.time}</Text>
            <CheckCheck size={14} color="#53BDEB" />
          </View>
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.row, styles.rowLeft]}>
      <View style={styles.bubbleThem}>
        {showName && (
          <Text style={[styles.senderName, { color: getColor(msg.sender) }]}>
            {msg.sender}
          </Text>
        )}
        <Text style={styles.textBase}>{msg.text}</Text>
        <View style={styles.metaThem}>
          <Text style={styles.timeText}>{msg.time}</Text>
        </View>
      </View>
    </View>
  );
}

function DateDivider() {
  return (
    <View style={styles.dateDivider}>
      <View style={styles.divPill}>
        <Text style={styles.divText}>Today</Text>
      </View>
    </View>
  );
}

export default function ChatScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const room = route?.params?.room ?? {
    room: '101', members: 4,
    memberNames: ['Veera Durgarao', 'Rahul Kumar', 'Anil Reddy', 'Surya Teja'],
  };

  const [msgs, setMsgs]   = useState(INITIAL_MSGS);
  const [text, setText]   = useState('');
  const flatRef = useRef<FlatList>(null);
  const scale   = useRef(new Animated.Value(1)).current;
  const [kbOpen, setKbOpen] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') return;
    const show = Keyboard.addListener('keyboardDidShow', () => setKbOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const scrollToEnd = () => {
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const send = () => {
    const t = text.trim();
    if (!t) return;

    Animated.sequence([
      Animated.timing(scale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,    duration: 100, useNativeDriver: true }),
    ]).start();

    const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setMsgs(prev => [...prev, { id: Date.now().toString(), sender: 'You', mine: true, text: t, time: now }]);
    setText('');
    scrollToEnd();

    const replyNames = ['Rahul', 'Anil', 'Durgarao', 'Surya'];
    const replyName  = replyNames[Math.floor(Math.random() * replyNames.length)];
    setTimeout(() => {
      const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
      setMsgs(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: replyName, mine: false, text: reply,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      }]);
      scrollToEnd();
    }, 1200);
  };

  const displayData: any[] = [{ type: 'divider', id: 'divider' }, ...msgs];

  return (
    <View style={{ flex: 1, backgroundColor: WA_BG }}>
      <StatusBar barStyle="light-content" backgroundColor={BLUE} />

      <View style={{ backgroundColor: BLUE }}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <ArrowLeft size={24} color={WHITE} />
              <View style={styles.groupAvatar}>
                <Text style={styles.groupAvatarText}>{room.room}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={{ flex: 1, paddingVertical: 4 }}>
              <Text style={styles.hRoomName}>Room {room.room}</Text>
              <Text style={styles.hRoomSub} numberOfLines={1}>
                {room.memberNames?.join(', ') || 'Veera, Rahul, Anil, Surya'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.hIconBtn}>
              <Phone size={20} color={WHITE} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.hIconBtn}>
              <MoreVertical size={20} color={WHITE} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1, marginBottom: kbOpen ? 0 : 0.1 }} 
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatRef}
          data={displayData}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 16, paddingBottom: 16, gap: 4 }}
          onLayout={scrollToEnd}
          renderItem={({ item, index }) => {
            if (item.type === 'divider') return <DateDivider />;
            const prev = index > 1 ? displayData[index - 1] : null;
            const showName = !item.mine && (!prev || prev.sender !== item.sender || prev.mine);
            return <Bubble msg={item} showName={showName} />;
          }}
        />

        <View style={[styles.waInputContainer, { paddingBottom: Platform.OS === 'ios' ? 24 : 32 }]}>
          <View style={styles.waPill}>
            <TouchableOpacity style={styles.waIconBtn}>
              <Smile size={24} color="#8696A0" />
            </TouchableOpacity>
            
            <TextInput
              style={styles.waTextInput}
              placeholder="Message"
              placeholderTextColor="#8696A0"
              value={text}
              onChangeText={setText}
              multiline
            />
            
            <TouchableOpacity style={styles.waIconBtn}>
              <Paperclip size={24} color="#8696A0" />
            </TouchableOpacity>
            
            {!text.trim() && (
              <TouchableOpacity style={styles.waIconBtnCamera}>
                <Camera size={24} color="#8696A0" />
              </TouchableOpacity>
            )}
          </View>

          <Animated.View style={{ transform: [{ scale }] }}>
            <TouchableOpacity style={styles.waSendBtn} onPress={text.trim() ? send : () => {}} activeOpacity={0.8}>
              {text.trim() ? (
                <Send size={20} color={WHITE} style={{ marginLeft: 3 }} />
              ) : (
                <Mic size={24} color={WHITE} />
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 10, gap: 8,
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center',
    gap: 4, borderRadius: 20, paddingRight: 4,
  },
  groupAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  groupAvatarText: { color: WHITE, fontSize: 13, fontWeight: '800' },
  hRoomName: { color: WHITE, fontSize: 18, fontWeight: '600', marginBottom: 2 },
  hRoomSub:  { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '400' },
  hIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },

  row: { flexDirection: 'row', gap: 6, marginVertical: 2 },
  rowRight: { justifyContent: 'flex-end' },
  rowLeft:  { justifyContent: 'flex-start' },

  bubbleMe: {
    backgroundColor: MY_BUBBLE,
    borderRadius: 16, borderTopRightRadius: 0,
    paddingHorizontal: 12, paddingVertical: 8,
    paddingRight: 8,
    maxWidth: W * 0.75,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 1, elevation: 1,
  },
  bubbleThem: {
    backgroundColor: WHITE,
    borderRadius: 16, borderTopLeftRadius: 0,
    paddingHorizontal: 12, paddingVertical: 8,
    paddingRight: 8,
    maxWidth: W * 0.75,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 1, elevation: 1,
  },
  textBase: { color: '#111B21', fontSize: 15, lineHeight: 21 },
  senderName: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  
  metaMe: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, justifyContent: 'flex-end' },
  metaThem: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, justifyContent: 'flex-end' },
  timeText: { color: '#667781', fontSize: 11 },

  dateDivider: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginVertical: 12,
  },
  divPill: {
    backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 1, elevation: 1,
  },
  divText: { fontSize: 12, color: '#54656F', fontWeight: '500' },

  waInputContainer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 8, paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  waPill: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: WHITE, borderRadius: 24,
    minHeight: 48, maxHeight: 120,
    paddingHorizontal: 8, paddingBottom: 12, paddingTop: 12,
  },
  waIconBtn: {
    width: 30, height: 24, alignItems: 'center', justifyContent: 'center',
  },
  waIconBtnCamera: {
    width: 30, height: 24, alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  waTextInput: {
    flex: 1, fontSize: 16, color: '#111B21',
    padding: 0, marginHorizontal: 8,
    marginTop: Platform.OS === 'ios' ? 2 : 0,
  },
  waSendBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: BLUE, 
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2, shadowRadius: 2, elevation: 2,
  },
});
