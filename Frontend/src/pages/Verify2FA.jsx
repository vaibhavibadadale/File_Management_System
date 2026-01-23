import React, { useState } from 'react';
import axios from 'axios';

const Verify2FA = ({ userId, onVerificationSuccess }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Sending the 6-digit code to the backend
      const response = await axios.post('/api/auth/verify-2fa', {
        userId,
        token: code,
      });

      if (response.data.success) {
        // Pass the final JWT/Session data back to your main Auth handler
        onVerificationSuccess(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">Two-Factor Authentication</h2>
      <p className="text-gray-600 mb-6 text-center">
        Enter the 6-digit code from your authenticator app.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          maxLength="6"
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} // Numbers only
          className="w-full text-center text-3xl tracking-widest border-2 border-gray-300 p-3 rounded-md focus:border-blue-500 focus:outline-none"
          required
        />

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className={`w-full py-3 rounded-md font-semibold text-white transition-colors ${
            loading || code.length !== 6 ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? 'Verifying...' : 'Verify Code'}
        </button>
      </form>
    </div>
  );
};

export default Verify2FA;