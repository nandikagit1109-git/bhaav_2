import React from 'react';
import { Phone, ExternalLink, ArrowLeft, Heart } from 'lucide-react';
import { FadeUp, SectionMark, InkRule } from '../motion/primitives';

const HELPLINES = [
  {
    name: 'Tele-MANAS',
    number: '14416',
    available: '24/7, toll-free',
    description: 'India\'s national mental health helpline, operated by the Ministry of Health and Family Welfare.',
    url: 'https://telemanas.mohfw.gov.in/',
    region: 'India — National',
  },
  {
    name: 'Vandrevala Foundation',
    number: '1860-266-2345',
    available: '24/7',
    description: 'Free, confidential crisis support and counselling in multiple Indian languages.',
    url: 'https://www.vandrevalafoundation.com/',
    region: 'India — National',
  },
  {
    name: 'KIRAN',
    number: '1800-599-0019',
    available: '24/7, toll-free',
    description: 'Government-run mental health rehabilitation helpline for emotional distress and crisis.',
    url: 'https://krpc.gov.in/',
    region: 'India — National',
  },
  {
    name: 'iCall',
    number: '9152987821',
    available: 'Mon–Sat, 8am–10pm',
    description: 'Professional counselling and support for individuals in emotional distress.',
    url: 'https://icallhelpline.org/',
    region: 'India — National',
  },
  {
    name: 'AASRA',
    number: '9820466726',
    available: '24/7',
    description: 'Volunteer-based crisis intervention and suicide prevention helpline.',
    url: 'http://www.aasra.info/',
    region: 'India — National',
  },
];

const INTERNATIONAL = [
  {
    name: '988 Suicide & Crisis Lifeline',
    number: '988',
    available: '24/7',
    region: 'United States',
  },
  {
    name: 'Samaritans',
    number: '116 123',
    available: '24/7, free',
    region: 'United Kingdom',
  },
  {
    name: 'Crisis Text Line',
    number: 'Text HOME to 741741',
    available: '24/7',
    region: 'United States',
  },
];

export default function CrisisPage({ onNavigate }) {
  return (
    <div className="max-w-3xl mx-auto pt-28 sm:pt-36 pb-24">
      <SectionMark index="!" label="Crisis support" />

      <div className="mt-10 space-y-6">
        <h1 className="text-display-section font-serif uppercase text-ink-950">
          If you need help<br />
          <span className="italic text-accent-pop">right now.</span>
        </h1>
        <p className="font-serif italic text-lg sm:text-xl text-ink-600 leading-relaxed max-w-xl">
          If you or someone you know is in immediate danger, please call your local
          emergency number or go to the nearest hospital emergency room.
        </p>
      </div>

      <FadeUp delay={0.15} className="mt-12">
        <div className="bg-accent-terracottaLight/40 border border-accent-terracotta/30 p-6 sm:p-8 space-y-3">
          <div className="flex items-center gap-2 eyebrow text-accent-terracotta">
            <Heart className="w-4 h-4" />
            <span>Immediate danger</span>
          </div>
          <p className="text-sm text-ink-700 leading-relaxed">
            If you are in immediate danger of harming yourself or others, call your
            local emergency services (112 in India, 911 in the US, 999 in the UK) or
            go to your nearest hospital emergency room. Do not wait.
          </p>
        </div>
      </FadeUp>

      <InkRule className="my-14" />

      {/* Indian Helplines */}
      <FadeUp>
        <span className="eyebrow text-accent-terracotta">India — 24/7 helplines</span>
        <h2 className="font-serif text-2xl sm:text-3xl text-ink-950 mt-4">
          You are not alone.
        </h2>
        <p className="text-sm text-ink-600 leading-relaxed mt-3 max-w-lg">
          These services are free, confidential, and available in multiple Indian
          languages. You do not need to explain why you are calling.
        </p>
      </FadeUp>

      <div className="mt-10 space-y-4">
        {HELPLINES.map((h, i) => (
          <FadeUp key={h.name} delay={0.08 * i}>
            <div className="border border-stone-border bg-paper-50 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-stone-borderStrong transition-colors">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <h3 className="font-serif text-lg text-ink-950">{h.name}</h3>
                  <span className="eyebrow text-ink-400">{h.region}</span>
                </div>
                <p className="text-xs text-ink-600 leading-relaxed max-w-md">{h.description}</p>
                <span className="eyebrow text-ink-500">{h.available}</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <a
                  href={`tel:${h.number.replace(/[^0-9]/g, '')}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink-950 text-paper-50 font-mono text-xs uppercase tracking-[0.14em] hover:bg-ink-800 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {h.number}
                </a>
                {h.url && (
                  <a
                    href={h.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-ink-600 hover:text-ink-950 transition-colors"
                  >
                    Website <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </FadeUp>
        ))}
      </div>

      <InkRule className="my-14" />

      {/* International */}
      <FadeUp>
        <span className="eyebrow text-ink-400">International resources</span>
        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          {INTERNATIONAL.map((h) => (
            <div key={h.name} className="border border-stone-border bg-paper-50 p-4 space-y-2">
              <span className="eyebrow text-ink-400">{h.region}</span>
              <h3 className="font-serif text-base text-ink-950">{h.name}</h3>
              <a
                href={`tel:${h.number.replace(/[^0-9]/g, '')}`}
                className="inline-flex items-center gap-1.5 font-mono text-sm text-ink-800 hover:text-ink-950 transition-colors"
              >
                <Phone className="w-3 h-3" />
                {h.number}
              </a>
              <span className="block text-[10px] text-ink-500">{h.available}</span>
            </div>
          ))}
        </div>
      </FadeUp>

      <InkRule className="my-14" />

      {/* Important note */}
      <FadeUp>
        <div className="bg-paper-100 border border-stone-border p-6 space-y-3">
          <span className="eyebrow text-ink-500">Important</span>
          <p className="text-sm text-ink-600 leading-relaxed max-w-xl">
            Bhaav is a self-awareness tool, not a crisis service. It cannot detect
            emergencies or contact emergency services on your behalf. If you are in
            distress, please reach out to one of the services above directly.
          </p>
          <p className="text-sm text-ink-600 leading-relaxed max-w-xl">
            These helplines are staffed by trained professionals and volunteers. You
            do not need to be suicidal to call — they are there for any emotional
            distress, loneliness, or overwhelm.
          </p>
        </div>
      </FadeUp>

      <FadeUp delay={0.2} className="mt-12">
        <button
          onClick={() => onNavigate ? onNavigate('home') : window.history.back()}
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-600 hover:text-ink-950 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Bhaav
        </button>
      </FadeUp>
    </div>
  );
}
