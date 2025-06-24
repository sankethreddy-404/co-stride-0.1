@@ .. @@
 -- Chat sessions policies
 CREATE POLICY "Users can manage their own chat sessions"
   ON chat_sessions
   FOR ALL
   TO authenticated
-  USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
-  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
+  USING ((uid() IS NOT NULL) AND (user_id = uid()))
+  WITH CHECK ((uid() IS NOT NULL) AND (user_id = uid()));

 -- Chat messages policies
 CREATE POLICY "Users can view their own chat messages"
   ON chat_messages
   FOR SELECT
   TO authenticated
   USING (
-    auth.uid() IS NOT NULL AND 
-    user_id = auth.uid()
+    (uid() IS NOT NULL) AND 
+    user_id = uid()
   );

 CREATE POLICY "Users can create their own chat messages"
   ON chat_messages
   FOR INSERT
   TO authenticated
   WITH CHECK (
-    auth.uid() IS NOT NULL AND 
-    user_id = auth.uid() AND
-    session_id IN (SELECT id FROM chat_sessions WHERE user_id = auth.uid())
+    (uid() IS NOT NULL) AND 
+    user_id = uid() AND
+    session_id IN (SELECT id FROM chat_sessions WHERE user_id = uid())
   );</parameter>