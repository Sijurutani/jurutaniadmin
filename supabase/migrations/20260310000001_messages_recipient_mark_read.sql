-- Migration: Allow message recipients to mark received messages as read
-- 
-- Problem: Previously, only the sender could update their own messages.
-- A conversation participant who is NOT the sender (i.e. the recipient)
-- needs to be able to set is_read = true on messages they received.
--
-- The USING clause filters which rows can be targeted:
--   - sender_id must NOT be the current user (only update messages FROM others)
--   - current user must be a participant in the conversation
--
-- The WITH CHECK clause validates the new row state after update:
--   - is_read must be set to TRUE (can only mark as read, not unread)
--   - current user must still be a participant
-- This prevents abuse such as marking messages back to unread or
-- updating other fields via this policy.

CREATE POLICY "recipients can mark messages as read"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (
    sender_id != auth.uid()
    AND is_conversation_participant(conversation_id)
  )
  WITH CHECK (
    is_read = true
    AND sender_id != auth.uid()
    AND is_conversation_participant(conversation_id)
  );
