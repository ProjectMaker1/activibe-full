// frontend/src/components/CampaignModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import countryList from 'react-select-country-list';
import 'flag-icons/css/flag-icons.min.css';


function CampaignModal({ campaign, isOpen, onClose, isAdmin = false, onDelete }) {
  if (!isOpen || !campaign) return null;
  const navigate = useNavigate();

  const countryOptions = useMemo(() => countryList().getData(), []);
  const countryMeta =
    (campaign.country &&
      countryOptions.find((c) => c.value === campaign.country)) ||
    null;
  // ✅ ORDERED media list (DB first, fallback legacy fields)
  const orderedMedia = useMemo(() => {
    if (Array.isArray(campaign.media) && campaign.media.length > 0) {
      return [...campaign.media].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }

    // fallback for old campaigns (no campaign.media)
    const fallback = [];
    if (campaign.imageUrl) {
      fallback.push({
        id: `legacy-image-${campaign.id}`,
        url: campaign.imageUrl,
        kind: 'IMAGE',
        order: 0,
        sourceType: 'OWN',
        sourceUrl: null,
      });
    }
    if (campaign.videoUrl) {
      fallback.push({
        id: `legacy-video-${campaign.id}`,
        url: campaign.videoUrl,
        kind: 'VIDEO',
        order: fallback.length,
        sourceType: 'OWN',
        sourceUrl: null,
      });
    }
    return fallback;
  }, [campaign]);

  // ✅ slides with numbering (Media 1..N) + per-item references
  const mediaSlides = useMemo(() => {
    return orderedMedia.map((m, idx) => ({
      id: m.id ?? `${m.kind}-${idx}`,
      type: m.kind === 'VIDEO' ? 'video' : 'image',
      url: m.url,
      sourceType: m.sourceType ?? 'OWN',
      sourceUrl: (m.sourceUrl || '').trim(),
      label: `Media ${idx + 1}`,
    }));
  }, [orderedMedia]);


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

{/* TOPICS */}
{Array.isArray(campaign.topics) && campaign.topics.length > 0 && (
  <div className="campaign-modal-details-row">
    <span className="campaign-modal-details-label">TOPICS</span>
    <span className="campaign-modal-details-value">
      {campaign.topics.join(', ')}
    </span>
  </div>
)}

{/* SUBTOPICS */}
{Array.isArray(campaign.subtopics) && campaign.subtopics.length > 0 && (
  <div className="campaign-modal-details-row">
    <span className="campaign-modal-details-label">SUB-TOPICS</span>
    <span className="campaign-modal-details-value">
      {campaign.subtopics.join(', ')}
    </span>
  </div>
)}

{/* TOOLS */}
{Array.isArray(campaign.tools) && campaign.tools.length > 0 && (
  <div className="campaign-modal-details-row">
    <span className="campaign-modal-details-label">TOOLS</span>
    <span className="campaign-modal-details-value">
      {campaign.tools.join(', ')}
    </span>
  </div>
)}

{/* SUBTOOLS */}
{Array.isArray(campaign.subTools) && campaign.subTools.length > 0 && (
  <div className="campaign-modal-details-row">
    <span className="campaign-modal-details-label">SUB-TOOLS</span>
    <span className="campaign-modal-details-value">
      {campaign.subTools.join(', ')}
    </span>
  </div>
)}

{/* DATE RANGE */}
{campaign.startDate && (
  <div className="campaign-modal-details-row">
    <span className="campaign-modal-details-label">DATE</span>
    <span className="campaign-modal-details-value">
      {new Date(campaign.startDate).toLocaleDateString()}
      {campaign.isOngoing ? (
        <>
          {' '}
          <span className="ongoing-pill">Ongoing</span>
        </>
      ) : campaign.endDate ? (
        <> — {new Date(campaign.endDate).toLocaleDateString()}</>
      ) : null}
    </span>
  </div>
)}
{/* MEDIA REFERENCES (per media item, Media 1..N) */}
{mediaSlides.length > 0 && (
  <div className="campaign-modal-details-row">
    <span className="campaign-modal-details-label">MEDIA REFERENCES</span>
    <span className="campaign-modal-details-value">
      <div className="campaign-modal-credit-list">
        {mediaSlides.map((m, idx) => {
          const isExternal = m.sourceType === 'EXTERNAL';
          return (
<div key={m.id ?? idx} className="campaign-modal-credit-item">
  <div className="campaign-modal-credit-row">
    <strong>{m.label}:</strong>

    {isExternal ? (
      m.sourceUrl ? (
        <a
          href={m.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="campaign-modal-credit-link"
        >
          View source
        </a>
      ) : (
        <span className="campaign-modal-credit-own">External</span>
      )
    ) : (
      <span className="campaign-modal-credit-own">Own</span>
    )}
  </div>
</div>

          );
        })}
      </div>
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

  {isAdmin && (
    <button
      type="button"
      className="btn-small-warning"
      onClick={() => {
        onClose?.();
        navigate('/upload', { state: { editCampaignId: campaign.id } });
      }}
    >
      Edit
    </button>
  )}

  <button type="button" className="btn-orange" onClick={onClose}>
    Close
  </button>
</footer>

      </div>
    </div>
  );
}

export default CampaignModal;
