// frontend/src/components/CampaignModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import countryList from 'react-select-country-list';
import 'flag-icons/css/flag-icons.min.css';

function CampaignModal({ campaign, isOpen, onClose, isAdmin = false, onDelete }) {
  if (!isOpen || !campaign) return null;

  const countryOptions = useMemo(() => countryList().getData(), []);
  const countryMeta =
    (campaign.country &&
      countryOptions.find((c) => c.value === campaign.country)) ||
    null;

  // სურათები (media + fallback imageUrl)
  const imageUrls =
    campaign.media && campaign.media.length
      ? campaign.media
          .filter((m) => m.kind === 'IMAGE')
          .map((m) => m.url)
      : campaign.imageUrl
      ? [campaign.imageUrl]
      : [];

  // ვიდეოები (media + fallback videoUrl)
  const videoUrlsRaw =
    campaign.media && campaign.media.length
      ? campaign.media
          .filter((m) => m.kind === 'VIDEO')
          .map((m) => m.url)
      : [];

  const videoUrls =
    videoUrlsRaw.length > 0
      ? videoUrlsRaw
      : campaign.videoUrl
      ? [campaign.videoUrl]
      : [];

  // 👉 ერთიანი სლაიდების მასივი: ჯერ სურათები, მერე ვიდეოები
  const mediaSlides = [
    ...imageUrls.map((url) => ({ type: 'image', url })),
    ...videoUrls.map((url) => ({ type: 'video', url })),
  ];

  const [activeIndex, setActiveIndex] = useState(0);
const [isVideoPlaying, setIsVideoPlaying] = useState(false);

useEffect(() => {
  setActiveIndex(0);
  setIsVideoPlaying(false);
}, [campaign?.id]);
useEffect(() => {
  setIsVideoPlaying(false);
}, [activeIndex]);

  const hasMultiple = mediaSlides.length > 1;
  const activeSlide = mediaSlides[activeIndex];

  const goPrev = () => {
    if (!hasMultiple) return;
    setActiveIndex((prev) => (prev - 1 + mediaSlides.length) % mediaSlides.length);
  };

  const goNext = () => {
    if (!hasMultiple) return;
    setActiveIndex((prev) => (prev + 1) % mediaSlides.length);
  };

  return (
    <div className="campaign-modal-overlay" onClick={onClose}>
      <div
        className="campaign-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* თავში სათაური + X */}
        <header className="campaign-modal-header">
          <h2>{campaign.title}</h2>
          <button
            type="button"
            className="campaign-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        {/* აღწერა ზემოთ */}
        {campaign.description && (
          <p className="campaign-modal-description">
            {campaign.description}
          </p>
        )}

        <div className="campaign-modal-body">
          {/* მარცხენა მხარე – ფოტოები + ვიდეოები */}
          <div className="campaign-modal-media">
            {/* მთავარი მედია (სურათი ან ვიდეო) */}

{activeSlide && (
  <div className="campaign-modal-main-image-wrapper">
    {activeSlide.type === 'image' ? (
      <img
        src={activeSlide.url}
        alt={campaign.title}
        className="campaign-modal-main-image"
      />
    ) : (
      <div className="campaign-modal-main-video-inner">
        <video
          src={activeSlide.url}
          controls
          className="campaign-modal-main-image"
          onPlay={() => setIsVideoPlaying(true)}
          onPause={() => setIsVideoPlaying(false)}
          onEnded={() => setIsVideoPlaying(false)}
        />
        {/* დიდი overlay – ჩნდება მხოლოდ როცა არ უკრავს */}
        {!isVideoPlaying && (
          <span
            className="campaign-modal-main-video-play"
            aria-hidden="true"
          />
        )}
      </div>
    )}

    {hasMultiple && (
      <>
        <button
          type="button"
          className="campaign-modal-arrow left"
          onClick={goPrev}
        >
          ‹
        </button>
        <button
          type="button"
          className="campaign-modal-arrow right"
          onClick={goNext}
        >
          ›
        </button>
      </>
    )}
  </div>
)}


            {/* თუმბნეილების რიგი – სურათებიც და ვიდეოებიც ერთად */}
{mediaSlides.length > 0 && (
  <div className="campaign-modal-thumbs">
    {mediaSlides.map((slide, idx) => (
      <button
        type="button"
        key={idx}
        className={`campaign-modal-thumb ${
          idx === activeIndex ? 'active' : ''
        }`}
        onClick={() => setActiveIndex(idx)}
      >
        {slide.type === 'image' ? (
          <img src={slide.url} alt={`Thumb ${idx + 1}`} />
        ) : (
          <div className="campaign-modal-thumb-video">
            <video
              src={slide.url}
              muted
              loop
              className="campaign-modal-thumb-video-tag"
            />
            {/* აქ ყურადღება: აღარ ვწერთ ▶-ს */}
            <span
              className="campaign-modal-thumb-play"
              aria-hidden="true"
            />
          </div>
        )}
      </button>
    ))}
  </div>
)}

          </div>

          {/* მარჯვენა მხარე – დეტალები */}
          <aside className="campaign-modal-sidebar">
            <h3>Details</h3>
            <div className="campaign-modal-details-list">
              {campaign.country && (
                <div className="campaign-modal-details-row">
                  <span className="campaign-modal-details-label">
                    COUNTRY
                  </span>
                  <span className="campaign-modal-details-value">
                    {countryMeta && (
                      <span
                        className={`fi fi-${countryMeta.value.toLowerCase()}`}
                        style={{ marginRight: 6 }}
                      />
                    )}
                    {countryMeta ? countryMeta.label : campaign.country}
                  </span>
                </div>
              )}

              {campaign.topic && (
                <div className="campaign-modal-details-row">
                  <span className="campaign-modal-details-label">
                    TOPIC
                  </span>
                  <span className="campaign-modal-details-value">
                    {campaign.topic}
                  </span>
                </div>
              )}

              {campaign.subtopic && (
                <div className="campaign-modal-details-row">
                  <span className="campaign-modal-details-label">
                    SUB-TOPIC
                  </span>
                  <span className="campaign-modal-details-value">
                    {campaign.subtopic}
                  </span>
                </div>
              )}

              {campaign.tools && (
                <div className="campaign-modal-details-row">
                  <span className="campaign-modal-details-label">
                    TOOLS
                  </span>
                  <span className="campaign-modal-details-value">
                    {campaign.tools}
                  </span>
                </div>
              )}

              {campaign.subTool && (
                <div className="campaign-modal-details-row">
                  <span className="campaign-modal-details-label">
                    SUB-TOOL
                  </span>
                  <span className="campaign-modal-details-value">
                    {campaign.subTool}
                  </span>
                </div>
              )}

              {campaign.date && (
                <div className="campaign-modal-details-row">
                  <span className="campaign-modal-details-label">
                    DATE
                  </span>
                  <span className="campaign-modal-details-value">
                    {new Date(campaign.date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </aside>
        </div>

        <footer className="campaign-modal-footer">
          {isAdmin && onDelete && (
            <button
              type="button"
              className="btn-small-danger"
              onClick={() => {
                if (
                  window.confirm(
                    'Are you sure you want to delete this campaign?'
                  )
                ) {
                  onDelete(campaign.id);
                }
              }}
              style={{ marginRight: 'auto' }}
            >
              Delete
            </button>
          )}

          <button type="button" className="btn-outline" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}

export default CampaignModal;
