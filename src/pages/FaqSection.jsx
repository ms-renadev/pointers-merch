import React, { useState } from 'react';

const faqData = [
  {
    id: '01',
    question: "Kailan at saan ang pick-up ng orders?",
    answer: "Ang official release date at pick-up location ay sa October 18, 2026 sa CICS-Multimedia Room. Ihanda lamang ang inyong Student ID at Order Reference Number. Sa araw na iyon ay mayroong GAAP, kaya lahat ng Freshmen na may NSTP/ROTC class ay ipapa-excuse—may approved excuse letter na para rito."
  },
  {
    id: '02',
    question: "Puwede bang magpa-claim sa ibang tao (Proxy Pick-up)?",
    answer: "Oo, pinapayagan ang proxy pick-up! Siguraduhin lamang na magdala ang iyong proxy ng authorization letter o screenshot ng iyong Order Confirmation, kasama ang photocopy o picture ng iyong Student ID."
  },
  {
    id: '03',
    question: "Puwede pa bang mag-cancel o magpabago ng size pagkatapos mag-order?",
    answer: "Paumanhin, ngunit hindi na po puwedeng mag-cancel o magpalit ng size kapag na-submit at na-process na ang inyong order. Ang mga items ay ipinapagawa batay sa eksaktong sukat at dami ng pre-order batch."
  },
  {
    id: '04',
    question: "Ano ang gagawin kung may sira o damage ang natanggap na merch?",
    answer: "Paki-check nang maigi ang item bago umalis sa pick-up booth. Ang replacement para sa factory defect ay maaari lamang ma-process sa mismong pick-up day habang nasa booth."
  }
];

const FaqSection = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="faq-section" id="faq" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header na kapareho ng Sizing Matrix / Catalog */}
      <div className="sizing-heading" style={{ marginBottom: '2.5rem', textAlign: 'left' }}>
        <span className="eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="status-dot" /> SYSTEM PROTOCOL // HELP DESK
        </span>
        <h2 style={{ fontSize: '2rem', marginTop: '0.5rem' }}>
          FREQUENTLY ASKED QUESTIONS <span style={{ opacity: 0.5, fontWeight: 'normal' }}>// FAQ_REGISTRY</span>
        </h2>
        <p style={{ marginTop: '0.5rem', opacity: 0.8 }}>
          Mga gabay, paalala, at mga operational protocol para sa inyong merch order at campus pick-up process.
        </p>
      </div>

      {/* Accordion Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {faqData.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={faq.id}
              style={{
                border: isOpen ? '1px solid var(--accent, #dc2626)' : '1px solid rgba(255, 255, 255, 0.12)',
                background: isOpen ? 'rgba(220, 38, 38, 0.04)' : 'rgba(15, 15, 15, 0.6)',
                borderRadius: '0px', // Cyber/brutalist sharp corners
                transition: 'all 0.2s ease',
                overflow: 'hidden'
              }}
            >
              <button
                type="button"
                onClick={() => toggleFaq(index)}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1.25rem 1.5rem',
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: '700',
                  letterSpacing: '0.02em'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingRight: '1rem' }}>
                  <span 
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      padding: '0.2rem 0.5rem',
                      border: '1px solid currentColor',
                      color: isOpen ? 'var(--accent, #dc2626)' : 'rgba(255, 255, 255, 0.4)',
                      background: 'rgba(0,0,0,0.2)'
                    }}
                  >
                    0x{faq.id}
                  </span>
                  <span style={{ color: isOpen ? 'var(--accent, #dc2626)' : 'inherit' }}>
                    {faq.question}
                  </span>
                </div>

                <span 
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '1.25rem',
                    transition: 'transform 0.2s ease',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    color: isOpen ? 'var(--accent, #dc2626)' : 'inherit',
                    opacity: isOpen ? 1 : 0.6
                  }}
                >
                  expand_more
                </span>
              </button>

              {isOpen && (
                <div
                  style={{
                    padding: '0 1.5rem 1.25rem 3.5rem',
                    fontSize: '0.875rem',
                    lineHeight: '1.7',
                    opacity: 0.85,
                    borderTop: '1px stroke rgba(255, 255, 255, 0.05)',
                    borderLeft: '2px solid var(--accent, #dc2626)',
                    marginLeft: '1.5rem',
                    marginBottom: '1.25rem'
                  }}
                >
                  {faq.answer.split('**').map((part, i) => 
                    i % 2 === 1 ? <strong key={i} style={{ color: '#fff', fontWeight: 'bold' }}>{part}</strong> : part
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Support Box */}
      <div 
        style={{
          marginTop: '2.5rem',
          padding: '1.25rem 1.5rem',
          border: '1px dashed rgba(255, 255, 255, 0.15)',
          background: 'rgba(0, 0, 0, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.8rem',
          opacity: 0.75
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>info</span>
          <span>May iba pang katanungan? Makipag-ugnayan sa CICS POINTERS Officers.</span>
        </div>
        <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', textTransform: 'uppercase' }}>
          POINTERS_FAQS
        </span>
      </div>
    </section>
  );
};

export default FaqSection;