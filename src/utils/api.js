const handleResponse = async (response) => {
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }
    return response.json();
  };
  
  export const createTransaction = async (amount, email) => {
    const response = await fetch(`${BACKEND_URL}/create-usdt-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount, buyer_email: email }),
    });
    return handleResponse(response);
  };