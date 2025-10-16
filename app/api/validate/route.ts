import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are an expert archaeologist analyzing satellite imagery for potential geoglyphs or archaeological features in the Amazon rainforest.

Analyze this satellite image and determine if it shows:
1. Potential geoglyphs (earthworks, geometric patterns)
2. Archaeological features (cleared areas, linear features, circular structures)
3. Natural formations that might be mistaken for archaeological features

Provide your analysis in JSON format with:
- isValid (boolean): true if this appears to be a valid archaeological feature
- confidence (number 0-100): your confidence level
- analysis (string): detailed explanation of what you observe
- features (array of strings): list of notable features observed

Be thorough but cautious. Consider vegetation patterns, geometric shapes, and human-made versus natural features.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
                detail: 'high',
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const result = response.choices[0]?.message?.content;

    if (!result) {
      throw new Error('No response from OpenAI');
    }

    const validationResult = JSON.parse(result);

    return NextResponse.json(validationResult);
  } catch (error) {
    console.error('Error validating image:', error);
    return NextResponse.json(
      { error: 'Failed to validate image' },
      { status: 500 }
    );
  }
}
