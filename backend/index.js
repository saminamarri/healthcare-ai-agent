const nodemailer = require('nodemailer');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { randomUUID } = require('crypto');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.join(__dirname, '.env') });
const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set in backend/.env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- Email Transporter Configuration ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Helper function to send confirmation email
async function sendAppointmentEmail(recipientEmail, appointmentDetails) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('Skipping email: EMAIL_USER or EMAIL_PASS not found in .env');
    return;
  }

  const targetEmail = recipientEmail || process.env.EMAIL_USER;

  const mailOptions = {
    from: `"CarePoint Health" <${process.env.EMAIL_USER}>`,
    to: targetEmail,
    subject: 'Appointment Confirmation - CarePoint Health Hub',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
        <h2 style="color: #2FAD58; margin-bottom: 10px;">Appointment Confirmed!</h2>
        <p style="color: #334155; font-size: 15px;">Dear <strong>${appointmentDetails.name}</strong>,</p>
        <p style="color: #475569; font-size: 14px;">Your appointment has been successfully booked with CarePoint Health Hub. Here are your schedule details:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b;"><strong>Department:</strong></td>
            <td style="padding: 8px 0; color: #0f172a;">${appointmentDetails.department}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b;"><strong>Date:</strong></td>
            <td style="padding: 8px 0; color: #0f172a;">${appointmentDetails.date}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b;"><strong>Time:</strong></td>
            <td style="padding: 8px 0; color: #0f172a;">${appointmentDetails.time}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; color: #64748b;"><strong>Status:</strong></td>
            <td style="padding: 8px 0; color: #2FAD58; font-weight: bold;">Confirmed</td>
          </tr>
        </table>
        
        <p style="color: #94a3b8; font-size: 12px; margin-top: 25px;">
          Need to reschedule? Please contact clinic support or reply directly to this email.
        </p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Confirmation email sent successfully:', info.messageId);
  } catch (err) {
    console.error('Email sending error:', err);
  }
}

app.get('/', (req, res) => {
  res.send('Healthcare Pre-Diagnosis Webhook Server Running Successfully!');
});

function evaluateTriage(message) {
  const lower = String(message || '').toLowerCase();

  if (lower.includes('chest pain') || lower.includes('breathing') || lower.includes('emergency')) {
    return 'critical';
  }

  if (lower.includes('fever') || lower.includes('severe') || lower.includes('pain')) {
    return 'urgent';
  }

  return 'mild';
}

function getReply(message, triageLevel) {
  const lower = String(message || '').toLowerCase();

  if (triageLevel === 'critical') {
    return '⚠️ Immediate Attention Required: Please visit the emergency room immediately or call 1122.';
  }

  if (lower.includes('no') || lower.includes('fine') || lower.includes('book') || lower.includes('appointment')) {
    return 'Would you like to schedule an appointment with a General Physician? Please reply with your name and department.';
  }

  if (triageLevel === 'urgent') {
    return 'Triage evaluation: Moderate. Are you experiencing severe chest pain or breathing issues?';
  }

  return "I've noted your symptoms. Our clinical triage system has logged your query.";
}

async function healthcare({ message, source = 'web' }) {
  const symptom = String(message || '').trim();
  if (!symptom) {
    const error = new Error('A symptom message is required');
    error.statusCode = 400;
    throw error;
  }

  const triageLevel = evaluateTriage(symptom);
  const symptomLogId = randomUUID();
  const { error: symptomError } = await supabase
    .from('symptoms_log')
    .insert([{ id: symptomLogId, symptom, source }]);

  if (symptomError) {
    throw symptomError;
  }

  const { error: triageError } = await supabase
    .from('triage_results')
    .insert([{ symptom_log_id: symptomLogId, triage_level: triageLevel, message: symptom, source }]);

  if (triageError) {
    throw triageError;
  }

  return { triageLevel, reply: getReply(symptom, triageLevel) };
}

// Dialogflow Webhook Endpoint
app.post('/webhook', async (req, res) => {
  try {
    const queryResult = req.body.queryResult || {};
    const intentName = queryResult.intent?.displayName;
    const parameters = queryResult.parameters || {};

    let fulfillmentMessages = [];

    // 1. Symptom.Collect
    if (intentName === 'Symptom.Collect') {
      const symptom = parameters.symptom || 'General illness';
      const duration = parameters.duration ? `${parameters.duration.amount || parameters.duration} days` : 'Not specified';
      const severity = parameters.severity || 'moderate';

      const { error: symptomError } = await supabase
        .from('symptoms_log')
        .insert([{ id: randomUUID(), symptom, duration, severity, source: 'dialogflow' }]);

      if (symptomError) {
        throw symptomError;
      }

      fulfillmentMessages = [
        {
          text: {
            text: [`Noted: ${symptom} for ${duration} (Severity: ${severity}). Are you experiencing any severe breathing difficulty or chest tightness?`]
          }
        }
      ];
    }

    // 2. Symptom.FollowUp
    else if (intentName === 'Symptom.FollowUp') {
      const userText = (queryResult.queryText || '').toLowerCase();
      let triageLevel = 'mild';

      if (userText.includes('yes') || userText.includes('breathing') || userText.includes('chest pain')) {
        triageLevel = 'critical';
      } else if (userText.includes('fever') || userText.includes('severe')) {
        triageLevel = 'urgent';
      }

      const { error: triageError } = await supabase
        .from('triage_results')
        .insert([{ symptom_log_id: null, triage_level: triageLevel, message: userText, source: 'dialogflow' }]);

      if (triageError) {
        throw triageError;
      }

      if (triageLevel === 'critical') {
        fulfillmentMessages = [
          {
            text: {
              text: ['⚠️ Immediate Attention Required: Please go directly to the nearest Emergency Room or call 1122.']
            }
          }
        ];
      } else {
        fulfillmentMessages = [
          {
            text: {
              text: [`Triage evaluated as: ${triageLevel.toUpperCase()}. Would you like to schedule an appointment? Please provide your full name and preferred department.`]
            }
          }
        ];
      }
    }

    // 3. Appointment.Book
    else if (intentName === 'Appointment.Book') {
      const name = parameters.name?.name || parameters.name || 'Patient';
      const phone = parameters.phone || 'N/A';
      const email = parameters.email || process.env.EMAIL_USER;
      const department = parameters.department || 'General Medicine';
      const preferred_date = parameters.preferred_date
        ? parameters.preferred_date.split('T')[0]
        : new Date().toISOString().split('T')[0];
      const preferred_time = parameters.preferred_time ? parameters.preferred_time.split('T')[1]?.substring(0, 5) : '10:00:00';

      const patientId = randomUUID();
      const { error: patientError } = await supabase
        .from('patients')
        .insert([{ id: patientId, name, phone }]);

      if (patientError) {
        throw patientError;
      }

      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert([
          {
            patient_id: patientId,
            department,
            preferred_date,
            preferred_time,
            status: 'confirmed'
          }
        ]);

      if (appointmentError) {
        throw appointmentError;
      }

      // Automated Email Notification
      await sendAppointmentEmail(email, {
        name,
        department,
        date: preferred_date,
        time: preferred_time
      });

      fulfillmentMessages = [
        {
          text: {
            text: [`Appointment confirmed for ${name} under ${department} on ${preferred_date} at ${preferred_time}. Confirmation email has been dispatched.`]
          }
        }
      ];
    }

    return res.json({ fulfillmentMessages });
  } catch (err) {
    console.error('Webhook processing failure:', err);
    return res.status(err.statusCode || 500).json({
      fulfillmentMessages: [{ text: { text: ['Service encountered an error. Please try again.'] } }]
    });
  }
});

// React Frontend Chat Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const result = await healthcare({ message: req.body.message });
    return res.json(result);
  } catch (err) {
    console.error('Healthcare request failed:', err);
    return res.status(err.statusCode || 500).json({
      error: err.statusCode === 400 ? err.message : 'Unable to process the healthcare request'
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server active on http://localhost:${PORT}`);
});