import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import db from '../config/database.js';
import { sendEmail } from '../utils/email.js';

export const submitRating = async (req: AuthRequest, res: Response) => {
  try {
    const student_id = req.user?.user_id;
    const { hostel_id, rating, comment, categories } = req.body;
    // rating: 1-5, comment: string, categories: { cleanliness, food, staff, facilities, value } each 1-5

    if (!student_id || !hostel_id || !rating) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    let rating_id: number;
    try {
      [rating_id] = await db('hostel_ratings').insert({
        student_id,
        hostel_id,
        rating,
        comment: comment || null,
        cleanliness_rating: categories?.cleanliness || null,
        food_rating: categories?.food || null,
        staff_rating: categories?.staff || null,
        facilities_rating: categories?.facilities || null,
        value_rating: categories?.value || null,
        created_at: new Date(),
      });
    } catch (e: any) {
      if (e?.code === 'ER_NO_SUCH_TABLE') {
        // Table doesn't exist, skip DB insert but still send email
        rating_id = 0;
      } else throw e;
    }

    // Fetch student and hostel details for email
    const student = await db('students').where('student_id', student_id).first();
    const hostel = await db('hostel_master').where('hostel_id', hostel_id).first();
    const owner = hostel ? await db('users').where('user_id', hostel.owner_id).first() : null;

    const studentName = student ? `${student.first_name} ${student.last_name || ''}`.trim() : 'A tenant';
    const hostelName = hostel?.hostel_name || 'Your Hostel';
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);

    // Email to owner
    if (owner?.email) {
      try {
        await sendEmail({
          to: owner.email,
          subject: `New Hostel Review — ${stars} (${rating}/5)`,
          html: `
            <div style="font-family:Arial,sans-serif;padding:24px;max-width:560px;">
              <h2 style="color:#2245D4;">New Review for ${hostelName}</h2>
              <p><strong>${studentName}</strong> left a <strong>${rating}/5</strong> review.</p>
              <p style="font-size:28px;letter-spacing:4px;color:#F59E0B;">${stars}</p>
              ${comment ? `<blockquote style="border-left:4px solid #2245D4;padding:12px 16px;background:#EEF2FF;border-radius:4px;margin:16px 0;color:#1E3A8A;">"${comment}"</blockquote>` : ''}
              ${categories ? `
              <table style="width:100%;border-collapse:collapse;margin-top:16px;">
                <tr><th style="text-align:left;padding:8px;border-bottom:1px solid #e5e7eb;">Category</th><th style="padding:8px;border-bottom:1px solid #e5e7eb;">Score</th></tr>
                ${Object.entries(categories).map(([k, v]) => `<tr><td style="padding:8px;border-bottom:1px solid #f3f4f6;text-transform:capitalize;">${k}</td><td style="padding:8px;border-bottom:1px solid #f3f4f6;text-align:center;">${v}/5</td></tr>`).join('')}
              </table>` : ''}
              <p style="color:#6b7280;font-size:13px;margin-top:24px;">This review was submitted via the Stayvix tenant app.</p>
            </div>
          `
        });
      } catch (err) {
        console.error('Failed to send rating email to owner:', err);
      }
    }

    // Confirmation email to tenant
    if (student?.email) {
      try {
        await sendEmail({
          to: student.email,
          subject: `Thank you for your review — ${hostelName}`,
          html: `
            <div style="font-family:Arial,sans-serif;padding:24px;max-width:560px;">
              <h2 style="color:#2245D4;">Thank you, ${student.first_name}!</h2>
              <p>Your <strong>${rating}/5</strong> review for <strong>${hostelName}</strong> has been submitted successfully.</p>
              <p style="font-size:28px;letter-spacing:4px;color:#F59E0B;">${stars}</p>
              ${comment ? `<p style="color:#4b5563;font-style:italic;">"${comment}"</p>` : ''}
              <p style="color:#6b7280;font-size:13px;margin-top:24px;">Your feedback helps improve the hostel experience for everyone. Thank you!</p>
            </div>
          `
        });
      } catch (err) {
        console.error('Failed to send rating confirmation email to tenant:', err);
      }
    }

    res.status(201).json({ success: true, message: 'Rating submitted successfully', rating_id });
  } catch (error: any) {
    console.error('Error submitting rating:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getHostelRatings = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId } = req.params;
    const ratings = await db('hostel_ratings')
      .leftJoin('students', 'hostel_ratings.student_id', 'students.student_id')
      .where('hostel_ratings.hostel_id', hostelId)
      .select('hostel_ratings.*', 'students.first_name', 'students.last_name')
      .orderBy('hostel_ratings.created_at', 'desc')
      .catch(() => []);

    const avg = ratings.length > 0
      ? (ratings.reduce((s: number, r: any) => s + r.rating, 0) / ratings.length).toFixed(1)
      : null;

    res.json({ success: true, data: ratings, average: avg, total: ratings.length });
  } catch (error: any) {
    console.error('Error fetching ratings:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/ratings/analytics/:hostelId — category satisfaction percentages
export const getRatingAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId } = req.params;
    const ratings = await db('hostel_ratings')
      .where('hostel_id', hostelId)
      .select(
        'rating',
        'cleanliness_rating',
        'food_rating',
        'staff_rating',
        'facilities_rating',
        'value_rating',
        'created_at'
      )
      .catch(() => []);

    const total = ratings.length;
    if (total === 0) {
      return res.json({ success: true, data: { total: 0, overall: null, categories: {}, trend: [] } });
    }

    // Category analytics: avg + distribution + satisfaction %
    const categories = ['food', 'cleanliness', 'staff', 'facilities', 'value'];
    const catAnalytics: Record<string, any> = {};
    for (const cat of categories) {
      const key = `${cat}_rating`;
      const values = ratings.map((r: any) => r[key]).filter((v: any) => v !== null && v !== undefined);
      if (values.length === 0) { catAnalytics[cat] = null; continue; }
      const avg = values.reduce((s: number, v: number) => s + Number(v), 0) / values.length;
      const low = values.filter((v: number) => Number(v) <= 2).length; // dissatisfied
      const high = values.filter((v: number) => Number(v) >= 4).length; // satisfied
      const dist = [1, 2, 3, 4, 5].map(star => values.filter((v: number) => Number(v) === star).length);
      catAnalytics[cat] = {
        avg: parseFloat(avg.toFixed(1)),
        low_pct: Math.round((low / values.length) * 100),
        high_pct: Math.round((high / values.length) * 100),
        dist, // count for stars 1-5
        count: values.length,
      };
    }

    // Overall distribution
    const overallDist = [1, 2, 3, 4, 5].map(star =>
      ratings.filter((r: any) => r.rating === star).length
    );
    const overallAvg = ratings.reduce((s: number, r: any) => s + Number(r.rating), 0) / total;

    // Last-30-day trend (weekly buckets)
    const trendMap: Record<string, number[]> = {};
    for (const r of ratings) {
      const week = new Date(r.created_at);
      week.setDate(week.getDate() - week.getDay()); // floor to Sunday
      const key = week.toISOString().slice(0, 10);
      if (!trendMap[key]) trendMap[key] = [];
      trendMap[key].push(Number(r.rating));
    }
    const trend = Object.entries(trendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([date, vals]) => ({
        date,
        avg: parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1)),
        count: vals.length,
      }));

    res.json({
      success: true,
      data: {
        total,
        overall: { avg: parseFloat(overallAvg.toFixed(1)), dist: overallDist },
        categories: catAnalytics,
        trend,
      },
    });
  } catch (error: any) {
    console.error('getRatingAnalytics error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getMyRating = async (req: AuthRequest, res: Response) => {
  try {
    const student_id = req.user?.user_id;
    const { hostel_id } = req.query;
    const rating = await db('hostel_ratings')
      .where({ student_id, hostel_id })
      .orderBy('created_at', 'desc')
      .first()
      .catch(() => null);
    res.json({ success: true, data: rating || null });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
