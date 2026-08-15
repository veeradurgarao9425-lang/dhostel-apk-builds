import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

export const getRoomChatDetails = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role_id !== 3) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { roomId } = req.params;

    // Validate if the tenant is actually assigned to this room
    const tenant = await db('students')
      .where({ student_id: user.user_id, room_id: roomId, status: 1 })
      .first();

    if (!tenant) {
      return res.status(403).json({ success: false, error: 'You do not have access to this room chat.' });
    }

    const room = await db('rooms').where({ room_id: roomId }).first();
    const membersCount = await db('students').where({ room_id: roomId, status: 1 }).count('* as count').first();

    res.json({
      success: true,
      data: {
        roomId: room.room_id,
        roomNumber: room.room_number,
        membersCount: membersCount ? membersCount.count : 0
      }
    });
  } catch (error) {
    console.error('getRoomChatDetails error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role_id !== 3) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const { roomId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Validate access
    const tenant = await db('students')
      .where({ student_id: user.user_id, room_id: roomId, status: 1 })
      .first();

    if (!tenant) {
      return res.status(403).json({ success: false, error: 'You do not have access to this room chat.' });
    }

    const messages = await db('chat_messages')
      .select(
        'chat_messages.*',
        'students.first_name',
        'students.last_name',
        'chat_reads.read_at'
      )
      .join('students', 'students.student_id', 'chat_messages.sender_id')
      .leftJoin('chat_reads', function() {
        this.on('chat_reads.message_id', '=', 'chat_messages.id')
          .andOn('chat_reads.student_id', '=', db.raw('?', [user.user_id]));
      })
      .where('chat_messages.room_id', roomId)
      .orderBy('chat_messages.created_at', 'desc')
      .limit(Number(limit))
      .offset(offset);

    // Fetch reactions for these messages
    const messageIds = messages.map(m => m.id);
    let reactions: any[] = [];
    if (messageIds.length > 0) {
      reactions = await db('chat_reactions')
        .whereIn('message_id', messageIds);
    }

    const formattedMessages = messages.map(m => {
      return {
        ...m,
        reactions: reactions.filter(r => r.message_id === m.id)
      };
    });

    res.json({
      success: true,
      data: formattedMessages
    });
  } catch (error) {
    console.error('getMessages error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

export const uploadMedia = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user || user.role_id !== 3) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const file = req.file;

    // Save upload record
    const [uploadId] = await db('chat_uploads').insert({
      filename: file.filename,
      original_name: file.originalname,
      mime_type: file.mimetype,
      size: file.size,
      uploaded_by: user.user_id
    });

    // Assume media is accessible via /uploads/chat/
    const fileUrl = `/uploads/chat/${file.filename}`;

    res.json({
      success: true,
      data: {
        id: uploadId,
        url: fileUrl,
        type: file.mimetype.startsWith('image/') ? 'image' : 'audio'
      }
    });
  } catch (error) {
    console.error('uploadMedia error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
