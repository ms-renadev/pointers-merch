import React, { useState } from 'react';

const faqData = [
  {
    question: "Kailan at saan ang pick-up ng orders?",
    answer: "Ang official release date at pick-up location ay sa **October 18, 2026**. Ihanda lamang ang inyong Student ID at Order Reference Number. Sa araw na iyon ay mayroong GAAP, kaya lahat ng Freshmen na may NSTP/ROTC class ay ipapa-excuse—may approved excuse letter na para rito."
  },
  {
    question: "Puwede bang magpa-claim sa ibang tao (Proxy Pick-up)?",
    answer: "Oo, pinapayagan ang proxy pick-up! Siguraduhin lamang na magdala ang iyong proxy ng authorization letter o screenshot ng iyong Order Confirmation, kasama ang photocopy o picture ng iyong Student ID."
  },
  {
    question: "Puwede pa bang mag-cancel o magpabago ng size pagkatapos mag-order?",
    answer: "Paumanhin, ngunit hindi na po puwedeng mag-cancel o magpalit ng size kapag na-submit at na-process na ang inyong order. Ang mga items ay ipinapagawa batay sa eksaktong sukat at dami ng pre-order batch."
  },
  {
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
    <section className="max-w-3xl mx-auto px-4 py-10 font-sans">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#800020] uppercase tracking-wide">
          Frequently Asked Questions
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          Mga gabay at paalala para sa inyong merch order at pick-up process.
        </p>
      </div>

      {/* Accordion Cards */}
      <div className="space-y-4">
        {faqData.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => toggleFaq(index)}
                className="w-full flex justify-between items-center p-4 md:p-5 text-left font-semibold text-gray-800 hover:text-[#800020] transition-colors focus:outline-none"
              >
                <span className="text-sm md:text-base pr-4">
                  {faq.question}
                </span>
                <span className="text-xl font-bold text-[#800020] min-w-[20px] text-center">
                  {isOpen ? '−' : '+'}
                </span>
              </button>

              {isOpen && (
                <div className="px-4 pb-5 md:px-5 text-xs md:text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3 bg-gray-50/50">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default FaqSection;