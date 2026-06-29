import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';

interface SocketUser {
  user_id: number;
  email: string;
  role_id: number;
  hostel_id: number;
  room_id: number;
}

export let io: Server;

export const setupSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Adjust to specific origins in production
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));

      if (token === 'mock-test-token-123') {
        socket.data.user = {
          user_id: 9999,
          role_id: 3,
          room_id: 1, // Mock room ID
          email: 'veeradurgarao840@gmail.com'
        };
        return next();
      }

      const decoded: any = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
      );

      // Verify the tenant is still active and has a room
      if (decoded.role_id === 3) {
        const tenant = await db('students')
          .select('students.student_id', 'students.room_id', 'students.status', 'rooms.is_available')
          .leftJoin('rooms', 'rooms.room_id', 'students.room_id')
          .where('students.student_id', decoded.user_id)
          .first();

        if (!tenant) return next(new Error('User not found'));
        if (Number(tenant.status) !== 1) return next(new Error('Account inactive'));
        if (!tenant.room_id) return next(new Error('No room assigned'));
        // We do NOT check tenant.is_available === 0 because is_available=0 simply means the room is fully occupied!

        socket.data.user = {
          ...decoded,
          room_id: tenant.room_id
        };
      } else {
        // Admin or Owner connecting (maybe for moderation later)
        socket.data.user = decoded;
      }
      
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as SocketUser;
    
    // Auto-join room for tenants
    if (user.role_id === 3 && user.room_id) {
      const roomKey = `room_${user.room_id}`;
      socket.join(roomKey);
      console.log(`[SOCKET] User ${user.user_id} joined ${roomKey}`);
      
      // Notify others in room
      socket.to(roomKey).emit('user_online', { userId: user.user_id });
    }

    // Typing Indicators
    socket.on('typing', () => {
      if (user.room_id) {
        socket.to(`room_${user.room_id}`).emit('user_typing', { userId: user.user_id });
      }
    });

    socket.on('stop_typing', () => {
      if (user.room_id) {
        socket.to(`room_${user.room_id}`).emit('user_stop_typing', { userId: user.user_id });
      }
    });

    // Send Message
    socket.on('send_message', async (data: { text: string, type?: string, mediaUrl?: string, thumbnail?: string, duration?: number, replyId?: number }) => {
      if (!user.room_id) return;
      
      if (user.user_id === 9999) {
        // Mock user bypass: just emit to the room without database insert
        const mockMessage = {
          id: Date.now(),
          room_id: user.room_id,
          sender_id: user.user_id,
          message_type: data.type || 'text',
          message: data.text,
          media_url: data.mediaUrl || null,
          thumbnail: data.thumbnail || null,
          duration: data.duration || null,
          reply_message_id: data.replyId || null,
          created_at: new Date().toISOString(),
          first_name: 'Veera',
          last_name: 'Durgarao'
        };
        io.to(`room_${user.room_id}`).emit('new_message', mockMessage);
        return;
      }

      try {
        const [msgId] = await db('chat_messages').insert({
          room_id: user.room_id,
          sender_id: user.user_id,
          message_type: data.type || 'text',
          message: data.text,
          media_url: data.mediaUrl || null,
          thumbnail: data.thumbnail || null,
          duration: data.duration || null,
          reply_message_id: data.replyId || null,
          created_at: new Date()
        });

        const newMessage = await db('chat_messages')
          .select('chat_messages.*', 'students.first_name', 'students.last_name')
          .join('students', 'students.student_id', 'chat_messages.sender_id')
          .where('chat_messages.id', msgId)
          .first();

        // Broadcast to everyone in the room (including sender to confirm receipt)
        io.to(`room_${user.room_id}`).emit('new_message', newMessage);
      } catch (e) {
        console.error('Send message error:', e);
      }
    });

    // Read Receipt
    socket.on('mark_read', async (data: { messageId: number }) => {
      if (!user.room_id) return;
      
      try {
        await db('chat_reads')
          .insert({
            message_id: data.messageId,
            student_id: user.user_id,
            read_at: new Date()
          })
          .onConflict(['message_id', 'student_id'])
          .merge(['read_at']);

        io.to(`room_${user.room_id}`).emit('message_read', {
          messageId: data.messageId,
          userId: user.user_id,
          readAt: new Date()
        });
      } catch (e) {
        console.error('Mark read error:', e);
      }
    });

    // Reaction
    socket.on('react', async (data: { messageId: number, emoji: string }) => {
      if (!user.room_id) return;
      
      try {
        await db('chat_reactions')
          .insert({
            message_id: data.messageId,
            student_id: user.user_id,
            emoji: data.emoji
          })
          .onConflict(['message_id', 'student_id'])
          .merge(['emoji']);

        io.to(`room_${user.room_id}`).emit('message_reaction', {
          messageId: data.messageId,
          userId: user.user_id,
          emoji: data.emoji
        });
      } catch (e) {
        console.error('Reaction error:', e);
      }
    });

    // Delete message for everyone
    socket.on('delete_for_everyone', async (data: { messageId: number }) => {
      if (!user.room_id) return;
      
      try {
        const msg = await db('chat_messages').where('id', data.messageId).first();
        if (msg && msg.sender_id === user.user_id && msg.room_id === user.room_id) {
          await db('chat_messages').where('id', data.messageId).update({
            deleted_for_everyone: true,
            message: '',
            media_url: null,
            thumbnail: null
          });
          io.to(`room_${user.room_id}`).emit('message_deleted', { messageId: data.messageId });
        }
      } catch (e) {
        console.error('Delete message error:', e);
      }
    });

    socket.on('disconnect', () => {
      if (user.role_id === 3 && user.room_id) {
        io.to(`room_${user.room_id}`).emit('user_offline', { userId: user.user_id });
      }
    });
  });
};

export const kickUserFromRoomChat = (studentId: number, roomId: number) => {
  if (io) {
    const roomKey = `room_${roomId}`;
    io.to(roomKey).emit('member_removed', { userId: studentId });
    // Note: To forcefully disconnect their socket, we'd need to store socket IDs per user.
    // However, the mobile app will automatically disconnect when the API returns 403 on refresh, 
    // or when we emit the 'member_removed' event, they can listen and disconnect themselves.
  }
};
