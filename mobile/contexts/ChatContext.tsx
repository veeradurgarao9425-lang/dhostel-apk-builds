import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../src/services/api';
import { useAuth } from './AuthContext';
import { AppState, AppStateStatus } from 'react-native';

// Using a similar base URL approach as API
const BASE_URL = (process.env.EXPO_PUBLIC_API_URL as string | undefined) || 'https://dhostel-backend.onrender.com/api';
const SOCKET_URL = BASE_URL.replace('/api', '');

export type Message = {
  id: number;
  room_id: number;
  sender_id: number;
  message_type: 'text' | 'image' | 'audio';
  message: string;
  media_url?: string;
  thumbnail?: string;
  duration?: number;
  reply_message_id?: number;
  deleted_for_everyone: boolean;
  edited: boolean;
  created_at: string;
  first_name?: string;
  last_name?: string;
  read_at?: string | null;
  reactions?: { emoji: string; student_id: number }[];
};

type ChatContextType = {
  socket: Socket | null;
  isConnected: boolean;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  sendMessage: (text: string, type?: string, mediaUrl?: string, thumbnail?: string, duration?: number, replyId?: number) => void;
  markAsRead: (messageId: number) => void;
  sendReaction: (messageId: number, emoji: string) => void;
  deleteMessage: (messageId: number) => void;
  typingUsers: Set<number>;
  sendTyping: () => void;
  stopTyping: () => void;
};

const ChatContext = createContext<ChatContextType>({
  socket: null,
  isConnected: false,
  messages: [],
  setMessages: () => {},
  sendMessage: () => {},
  markAsRead: () => {},
  sendReaction: () => {},
  deleteMessage: () => {},
  typingUsers: new Set(),
  sendTyping: () => {},
  stopTyping: () => {},
});

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Background state recovery
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && socket && !socket.connected) {
        socket.connect();
      }
    });
    return () => {
      subscription.remove();
    };
  }, [socket]);

  useEffect(() => {
    let newSocket: Socket | null = null;

    const connectSocket = async () => {
      // Connect only if user is logged in and has an active room assigned
      if (user?.id && user?.status === 1) {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;

        // Load existing history before the socket starts delivering new messages,
        // so opening a chat doesn't show a blank room.
        if (user.room_id) {
          try {
            const res = await api.get(`/chat/messages/${user.room_id}`);
            if (res.data.success) setMessages(res.data.data || []);
          } catch {
            // Non-fatal — the room chat still works for new messages via the socket.
          }
        }

        // In real app, you might want to fetch base url from config
        newSocket = io(SOCKET_URL, {
          auth: { token },
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
        });

        newSocket.on('connect', () => {
          setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
          setIsConnected(false);
        });

        newSocket.on('new_message', (msg: Message) => {
          setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev;
            return [msg, ...prev]; // Prepend for FlatList inverted
          });
        });

        newSocket.on('message_read', ({ messageId, userId, readAt }) => {
          setMessages(prev => prev.map(m => 
            m.id === messageId ? { ...m, read_at: readAt } : m
          ));
        });

        newSocket.on('message_reaction', ({ messageId, userId, emoji }) => {
          setMessages(prev => prev.map(m => {
            if (m.id === messageId) {
              const reactions = m.reactions || [];
              const filtered = reactions.filter(r => r.student_id !== userId);
              return { ...m, reactions: [...filtered, { emoji, student_id: userId }] };
            }
            return m;
          }));
        });

        newSocket.on('message_deleted', ({ messageId }) => {
          setMessages(prev => prev.map(m => 
            m.id === messageId ? { ...m, deleted_for_everyone: true, message: '', media_url: undefined } : m
          ));
        });

        newSocket.on('user_typing', ({ userId }) => {
          setTypingUsers(prev => {
            const next = new Set(prev);
            next.add(userId);
            return next;
          });
        });

        newSocket.on('user_stop_typing', ({ userId }) => {
          setTypingUsers(prev => {
            const next = new Set(prev);
            next.delete(userId);
            return next;
          });
        });

        // Forced kick
        newSocket.on('member_removed', ({ userId }) => {
          if (userId === user.id) {
            newSocket?.disconnect();
          }
        });

        setSocket(newSocket);
      }
    };

    connectSocket();

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [user]);

  const sendMessage = useCallback((text: string, type: string = 'text', mediaUrl?: string, thumbnail?: string, duration?: number, replyId?: number) => {
    if (socket && isConnected) {
      socket.emit('send_message', { text, type, mediaUrl, thumbnail, duration, replyId });
    }
  }, [socket, isConnected]);

  const markAsRead = useCallback((messageId: number) => {
    if (socket && isConnected) {
      socket.emit('mark_read', { messageId });
    }
  }, [socket, isConnected]);

  const sendReaction = useCallback((messageId: number, emoji: string) => {
    if (socket && isConnected) {
      socket.emit('react', { messageId, emoji });
    }
  }, [socket, isConnected]);

  const deleteMessage = useCallback((messageId: number) => {
    if (socket && isConnected) {
      socket.emit('delete_for_everyone', { messageId });
    }
  }, [socket, isConnected]);

  const sendTyping = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('typing');
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing');
      }, 3000);
    }
  }, [socket, isConnected]);

  const stopTyping = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('stop_typing');
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  }, [socket, isConnected]);

  return (
    <ChatContext.Provider value={{
      socket,
      isConnected,
      messages,
      setMessages,
      sendMessage,
      markAsRead,
      sendReaction,
      deleteMessage,
      typingUsers,
      sendTyping,
      stopTyping
    }}>
      {children}
    </ChatContext.Provider>
  );
};
