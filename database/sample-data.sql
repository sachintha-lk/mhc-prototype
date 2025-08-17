-- Sample data for Mental Health Companion Demo
-- This data is designed to showcase various scenarios for judges

-- Insert demo users
INSERT INTO users (email, name, preferences, emergency_contact) VALUES 
('demo.student@university.edu', 'Alex Chen', 
 '{"notifications": true, "crisis_alerts": true, "preferred_time": "evening"}',
 '{"name": "Sarah Chen", "phone": "+65-9123-4567", "relationship": "Sister"}'),
('jane.smith@university.edu', 'Jane Smith', 
 '{"notifications": true, "crisis_alerts": true, "preferred_time": "afternoon"}',
 '{"name": "Dr. Smith", "phone": "+65-9876-5432", "relationship": "Parent"}'),
('demo.counselor@university.edu', 'Dr. Lisa Wong', 
 '{"role": "counselor", "specialization": "anxiety_depression"}',
 '{"name": "Emergency Services", "phone": "999"}')
ON CONFLICT (email) DO NOTHING;

-- Insert demo conversations
INSERT INTO conversations (user_id, title, session_data, status) VALUES 
(1, 'Exam Stress and Anxiety', '{"session_id": "sess_001", "mood_tracking": ["anxious", "overwhelmed"]}', 'active'),
(1, 'Sleep Problems', '{"session_id": "sess_002", "mood_tracking": ["tired", "restless"]}', 'active'),
(2, 'Feeling Overwhelmed', '{"session_id": "sess_003", "mood_tracking": ["sad", "hopeless"]}', 'escalated'),
(1, 'Coping Strategies Discussion', '{"session_id": "sess_004", "mood_tracking": ["better", "hopeful"]}', 'archived')
ON CONFLICT DO NOTHING;

-- Insert demo messages showcasing different scenarios
INSERT INTO messages (conversation_id, role, content, sentiment, confidence_score, intent_name, escalation_flag) VALUES 
-- Conversation 1: Exam Stress
(1, 'user', 'I am feeling really stressed about my upcoming exams. I cannot sleep and keep worrying about failing.', 'negative', 0.85, 'academic_stress', false),
(1, 'assistant', 'I understand that exam stress can feel overwhelming. It is completely normal to feel anxious before important tests. Let us work together on some strategies to help you manage this stress. Can you tell me what specific aspects of the exams worry you most?', 'neutral', 0.92, 'supportive_response', false),
(1, 'user', 'I am worried I have not studied enough and that I will forget everything during the exam. My mind just goes blank when I think about it.', 'negative', 0.78, 'academic_anxiety', false),
(1, 'assistant', 'That sounds like test anxiety, which is very common among students. The good news is there are effective techniques to help. Have you tried any relaxation or breathing exercises before? Also, creating a structured study schedule might help you feel more prepared and confident.', 'positive', 0.88, 'coping_strategies', false),

-- Conversation 2: Sleep Problems
(2, 'user', 'I have been having trouble sleeping for weeks now. I lie in bed thinking about everything I need to do.', 'negative', 0.72, 'sleep_issues', false),
(2, 'assistant', 'Sleep difficulties can really impact your overall wellbeing and academic performance. It sounds like your mind is quite active at bedtime. Let me suggest some sleep hygiene techniques that many students find helpful. Do you have a regular bedtime routine currently?', 'neutral', 0.89, 'sleep_support', false),

-- Conversation 3: Crisis scenario (escalated)
(3, 'user', 'I feel like nothing matters anymore. I cannot handle the pressure and sometimes I think everyone would be better off without me.', 'crisis', 0.95, 'crisis_indicators', true),
(3, 'assistant', 'I am very concerned about what you are sharing with me. These feelings are serious and I want you to know that you are not alone. Your life has value and there are people who want to help. I am going to connect you with immediate support resources. In the meantime, please stay safe. Do you have someone you trust that you can reach out to right now?', 'crisis', 0.96, 'crisis_response', true),
(3, 'system', 'CRISIS ALERT: User expressing suicidal ideation. Counselor notified. Emergency protocols activated.', 'crisis', 1.00, 'crisis_escalation', true),

-- Conversation 4: Positive progress
(4, 'user', 'The breathing exercises you taught me last week have been really helpful. I used them before my presentation and felt much calmer.', 'positive', 0.91, 'progress_update', false),
(4, 'assistant', 'That is wonderful to hear! I am so glad the breathing exercises are working for you. It shows that you are developing important coping skills. How did the presentation go overall?', 'positive', 0.94, 'positive_reinforcement', false),
(4, 'user', 'It went much better than expected! I still felt nervous but I was able to manage it. Thank you for your help.', 'positive', 0.93, 'success_story', false),
(4, 'assistant', 'You should feel proud of yourself for putting these techniques into practice. That takes courage and commitment. These skills will continue to serve you well in future challenging situations.', 'positive', 0.96, 'encouragement', false)

ON CONFLICT DO NOTHING;

-- Insert crisis alerts
INSERT INTO crisis_alerts (user_id, message_id, conversation_id, severity, status, assigned_counselor, notes) VALUES 
(2, 3, 3, 'critical', 'acknowledged', 'Dr. Lisa Wong', 'User expressing suicidal ideation. Immediate intervention required. Parent contacted.')
ON CONFLICT DO NOTHING;

-- Insert sample appointments
INSERT INTO appointments (user_id, counselor_name, appointment_date, type, status, notes) VALUES 
(1, 'Dr. Lisa Wong', CURRENT_TIMESTAMP + INTERVAL '2 days', 'counseling', 'scheduled', 'Follow-up for exam stress management'),
(2, 'Dr. Lisa Wong', CURRENT_TIMESTAMP + INTERVAL '1 day', 'crisis', 'confirmed', 'Emergency session - crisis intervention required'),
(1, 'Dr. Michael Tan', CURRENT_TIMESTAMP + INTERVAL '1 week', 'group', 'scheduled', 'Group therapy for academic stress'),
(2, 'Dr. Lisa Wong', CURRENT_TIMESTAMP - INTERVAL '1 day', 'counseling', 'completed', 'Initial assessment completed')
ON CONFLICT DO NOTHING;

-- Insert feedback samples
INSERT INTO feedback (user_id, conversation_id, rating, feedback_text, category) VALUES 
(1, 1, 5, 'The AI companion was very helpful and provided practical advice for managing my exam stress.', 'helpful'),
(1, 4, 5, 'I appreciate how the system remembered our previous conversations and built on the techniques we discussed.', 'helpful'),
(2, 3, 4, 'The crisis response was quick and appropriate. I felt heard and supported during a difficult time.', 'helpful')
ON CONFLICT DO NOTHING;

-- Insert user sessions (for demo purposes)
INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent) VALUES 
(1, 'demo_session_token_001', CURRENT_TIMESTAMP + INTERVAL '24 hours', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
(2, 'demo_session_token_002', CURRENT_TIMESTAMP + INTERVAL '24 hours', '192.168.1.101', 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)')
ON CONFLICT DO NOTHING;
