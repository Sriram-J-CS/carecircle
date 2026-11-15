import { describe, it, expect } from 'vitest';
import { DICTIONARY } from '../context/LanguageContext';

describe('Multi-Language Dictionary (EN, TA, HI)', () => {
  it('contains essential elder care strings across English, Tamil, and Hindi', () => {
    const requiredKeys = [
      'app_name',
      'good_morning',
      'next_tablet',
      'time_for_medicine',
      'take_it_now',
      'remind_in_10',
      'health_checkin',
      'feeling_question',
      'symptoms_question',
      'none_of_these',
      'yes_order',
      'no_thanks',
      'all_good',
      'needs_attention',
      'emergency',
    ];

    for (const key of requiredKeys) {
      expect(DICTIONARY[key], `Missing translation key: ${key}`).toBeDefined();
      expect(DICTIONARY[key].en.length).toBeGreaterThan(0);
      expect(DICTIONARY[key].ta.length).toBeGreaterThan(0);
      expect(DICTIONARY[key].hi.length).toBeGreaterThan(0);
    }
  });
});
