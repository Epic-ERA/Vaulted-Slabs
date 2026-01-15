const PSA_API_BASE_URL = 'https://api.psacard.com/publicapi/cert';

export interface PSACertData {
  PSACert: {
    CertNumber: number;
    CardNumber: string;
    CardGrade: string;
    CardLabel: string;
    CardCategory: string;
    Species: string;
    Variety: string;
    Year: string;
    Brand: string;
    CardName: string;
    Subject: string;
    CardAttributes: string;
    TotalPopulation: number;
    PopulationHigher: number;
    FrontImageURL: string;
    BackImageURL: string;
  };
}

export async function lookupPSACert(certNumber: string): Promise<PSACertData | null> {
  try {
    const url = `${PSA_API_BASE_URL}/GetByCertNumber/${certNumber}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`PSA API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('PSA lookup error:', error);
    throw error;
  }
}
