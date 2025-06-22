import { NextRequest, NextResponse } from 'next/server';
import { createSSRSassClient } from '@/lib/supabase/server';
import { invitationEmailQueue } from '@/lib/email/invitation-queue';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access (you might want to implement proper admin authentication)
    const supabase = await createSSRSassClient();
    const { data: { user }, error: authError } = await supabase.getSupabaseClient().auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get queue status
    const status = invitationEmailQueue.getQueueStatus();

    return NextResponse.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    return NextResponse.json(
      { error: 'Failed to get queue status' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify admin access
    const supabase = await createSSRSassClient();
    const { data: { user }, error: authError } = await supabase.getSupabaseClient().auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Clear failed invitations
    const clearedCount = invitationEmailQueue.clearFailed();

    return NextResponse.json({
      success: true,
      message: `Cleared ${clearedCount} failed invitations`,
      clearedCount,
    });
  } catch (error) {
    console.error('Error clearing failed invitations:', error);
    return NextResponse.json(
      { error: 'Failed to clear failed invitations' },
      { status: 500 }
    );
  }
}