const API_BASE_URL = 'http://localhost:8000';

export async function predictImage(imageBlob) {
  const formData = new FormData();

  formData.append(
    'file',
    imageBlob,
    'camera-frame.jpg'
  );

  const response = await fetch(`${API_BASE_URL}/predict`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    throw new Error(
      errorData?.detail || 'Prediction request failed'
    );
  }

  return await response.json();
}
