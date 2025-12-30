import React from 'react';
import './CampaignBadges.css';

const CampaignBadges = ({ badges }) => {
  if (!badges || badges.length === 0) {
    return null;
  }

  const getBadgeIcon = (badgeType) => {
    switch (badgeType) {
      case 'Gold':
        return '🥇';
      case 'Silver':
        return '🥈';
      case 'Bronze':
        return '🥉';
      default:
        return '';
    }
  };

  const getBadgeClass = (badgeType) => {
    switch (badgeType) {
      case 'Gold':
        return 'badge-gold';
      case 'Silver':
        return 'badge-silver';
      case 'Bronze':
        return 'badge-bronze';
      default:
        return 'badge-default';
    }
  };

  return (
    <div className="campaign-badges-section">
      <h3>Campaign Badges</h3>
      <p className="badges-subtitle">Earned for being a top donor in campaigns</p>
      
      <div className="badges-grid">
        {badges.map((badgeData, index) => (
          <div key={index} className={`badge-card ${getBadgeClass(badgeData.badge)}`}>
            <div className="badge-icon">
              {getBadgeIcon(badgeData.badge)}
            </div>
            <div className="badge-content">
              <h4 className="badge-type">{badgeData.badge} Badge</h4>
              <p className="badge-campaign-name">{badgeData.campaignName || 'Unknown Campaign'}</p>
              <div className="badge-details">
                <span className="badge-donation">
                  💰 ${badgeData.donationAmount?.toFixed(2) || '0.00'}
                </span>
                <span className="badge-date">
                  📅 {new Date(badgeData.earnedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CampaignBadges;
