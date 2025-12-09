// frontend/src/components/CampaignCard.jsx
import React, { useMemo } from 'react';
import countryList from 'react-select-country-list';
import 'flag-icons/css/flag-icons.min.css';

function CampaignCard({ campaign, onClick }) {
  const countryOptions = useMemo(() => countryList().getData(), []);
  const countryMeta =
    campaign.country &&
    countryOptions.find((c) => c.value === campaign.country) || null;

  const formattedDate = campaign.date
    ? new Date(campaign.date).toLocaleDateString()
    : null;

  return (
    <div
      className="campaign-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick?.();
      }}
    >
      {campaign.imageUrl && (
        <div className="campaign-image-wrapper">
          <img
            src={campaign.imageUrl}
            alt={campaign.title}
            className="campaign-image"
          />
        </div>
      )}

      <div className="campaign-card-body">
        <h3>{campaign.title}</h3>

        <p className="campaign-description">{campaign.description}</p>

        {/* Topic / Sub-topic tags */}
        <div className="campaign-tags">
          {campaign.topic && <span className="tag">{campaign.topic}</span>}
          {campaign.subtopic && <span className="tag">{campaign.subtopic}</span>}
        </div>

        {/* Country + Date row */}
        <div
          className="campaign-card-meta"
          style={{
            marginTop: '0.6rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8rem',
            color: '#6b7280',
          }}
        >
          {countryMeta && (
            <div
              className="campaign-card-country"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <span
                className={`fi fi-${countryMeta.value.toLowerCase()}`}
                style={{ flexShrink: 0 }}
              />
              <span>{countryMeta.label}</span>
            </div>
          )}

          {formattedDate && (
            <span className="campaign-card-date">
              {formattedDate}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default CampaignCard;
