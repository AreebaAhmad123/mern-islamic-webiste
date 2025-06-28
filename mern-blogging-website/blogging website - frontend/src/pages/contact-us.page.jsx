import React, { useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';

const ContactUsPage = () => {
  const [form, setForm] = useState({ subject: '', name: '', email: '', explanation: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_DOMAIN || ''}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setForm({ subject: '', name: '', email: '', explanation: '' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send message.' });
        toast.error(data.error || 'Failed to send message.');
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to send message.' });
      toast.error('Failed to send message.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-[5vw] py-6">
      <Toaster />
      {/* Feedback message */}
      {message && (
        <div className={`mb-4 p-3 rounded text-sm ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message.text}</div>
      )}
      <div className="max-w-6xl mx-auto">
        {/* Main Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 flex flex-col gap-6">
          {/* Top Row: Subject, Name, Email */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Subject</label>
              <input name="subject" value={form.subject} onChange={handleChange} type="text" className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder-gray-100" placeholder="Subject" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Name</label>
              <input name="name" value={form.name} onChange={handleChange} type="text" className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder-gray-100" placeholder="Name" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Email</label>
              <input name="email" value={form.email} onChange={handleChange} type="email" className="w-full rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400 placeholder-gray-100" placeholder="Email" />
            </div>
          </div>

          {/* Explanation and File Upload */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* Explanation Area */}
            <div className="flex-1">
              <label className="block text-sm text-gray-700 mb-1">Explanation</label>
              <div className="bg-gray-100 rounded-lg p-4">
                {/* Formatting Buttons */}
                <div className="flex gap-2 mb-3">
                  <button type="button" className="bg-white border border-gray-200 rounded px-2 py-1 text-xs flex items-center gap-1 hover:bg-gray-50"><i className="fi fi-rs-picture"></i> Image</button>
                  <button type="button" className="bg-white border border-gray-200 rounded px-2 py-1 text-xs flex items-center gap-1 hover:bg-gray-50"><i className="fi fi-rc-eye-dropper"></i> Color</button>
                  <button type="button" className="bg-white border border-gray-200 rounded px-2 py-1 text-xs flex items-center gap-1 hover:bg-gray-50"><i className="fi fi-rr-text"></i> Text</button>
                  <button type="button" className="bg-white border border-gray-200 rounded px-2 py-1 text-xs flex items-center gap-1 hover:bg-gray-50"><i className="fi fi-rr-symbol"></i> Align</button>
                  <button type="button" className="bg-white border border-gray-200 rounded px-2 py-1 text-xs flex items-center gap-1 hover:bg-gray-50"><i className="fi fi-rr-link-alt"></i> Link</button>
                </div>
                {/* Textarea */}
                <textarea name="explanation" value={form.explanation} onChange={handleChange} className="w-full h-32 rounded-md border border-gray-200 p-3 bg-gray-50 focus:outline-none resize-none placeholder-gray-100" placeholder="Type..." />
              </div>
            </div>

            {/* File Upload */}
            <div className="w-full md:w-64">
              <label className="block text-sm text-gray-700 mb-1">Add File</label>
              <div className="bg-gray-100 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center h-48 p-4">
                <span className="text-5xl text-gray-300 mb-2"><i className="fi fi-rr-folder-open"></i></span>
                <span className="text-xs text-gray-400 mb-2 text-center">Drop Image Here, Paste Or</span>
                <button type="button" className="bg-white border border-gray-200 rounded px-3 py-1 text-xs hover:bg-gray-50">+ Select</button>
              </div>
            </div>
          </div>

          {/* Send Button */}
          <div className="flex justify-end">
            <button type="submit" disabled={loading} className="bg-yellow-400 hover:bg-yellow-500 text-white font-semibold px-6 py-2 rounded-lg flex items-center gap-2 shadow-md disabled:opacity-50">
              <i className="fi fi-rs-paper-plane"></i> {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactUsPage; 