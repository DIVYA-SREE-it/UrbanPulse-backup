const API_BASE_URL = 'http://localhost:8000';

export async function detectRoadDamage(imageBlob) {
  const formData = new FormData();

  formData.append(
    'file',
    imageBlob,
    'frame.jpg'
  );

  const response = await fetch(
    `${API_BASE_URL}/predict`,
    {
      method: 'POST',
      body: formData
    }
  );

  if (!response.ok) {
    const error = await response.text();

    throw new Error(
      `YOLO API Error: ${response.status} - ${error}`
    );
  }

  return response.json();
}