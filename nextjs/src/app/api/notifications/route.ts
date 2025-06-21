import { NextRequest, NextResponse } from 'next/server';
import { createSSRSassClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { 
      userId, 
      workspaceId, 
      type, 
      title, 
      message, 
      data = {} 
    } = await request.json();

    if (!userId || !type || !title || !message) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    const supabase = await createSSRSassClient();
    
    // Create notification
    const { data: notification, error } = await supabase.getSupabaseClient()
      .from('notifications')
      .insert({
        user_id: userId,
        workspace_id: workspaceId,
        type,
        title,
        message,
        data
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      notification 
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}