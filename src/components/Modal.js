import { useState, useEffect } from 'react';

export default function Modal({ isOpen, onClose, service, t, lang }) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    birthDate: '',
    birthPlace: '',
    phone: '',
    langLevel: '',
    motivation: ''
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setShowSuccess(false);
      setFormData({
        firstName: '',
        lastName: '',
        birthDate: '',
        birthPlace: '',
        phone: '',
        langLevel: '',
        motivation: ''
      });
      setErrors({});
    }
  }, [isOpen]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: false });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    const requiredFields = ['firstName', 'lastName', 'birthDate', 'birthPlace', 'phone'];
    if (service === 'lang') requiredFields.push('langLevel');
    
    requiredFields.forEach(field => {
      if (!formData[field].trim()) {
        newErrors[field] = true;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTimeout(() => setErrors({}), 2000);
      return;
    }

    setShowSuccess(true);
    launchConfetti();
  };

  const launchConfetti = () => {
    const colors = ['#045283', '#0570b0', '#0a8acb', '#f4b41a', '#ffffff'];
    const box = document.querySelector('.modal-box');
    if (!box) return;
    
    for (let i = 0; i < 20; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.cssText = `
        left: ${Math.random() * 100}%;
        top: 0;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        animation-delay: ${Math.random() * 0.4}s;
        animation-duration: ${1.5 + Math.random()}s;
      `;
      box.appendChild(c);
      setTimeout(() => c.remove(), 2400);
    }
  };

  const getTitle = () => {
    if (service === 'support') return t.supportTitle;
    if (service === 'lang') return t.langTitle;
    if (service === 'vip') return t.vipTitle;
    return t.formTitle;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay active" onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}>
      <div className="modal-box">
        {!showSuccess ? (
          <div id="form-view">
            <div className="modal-header">
              <div className="modal-title">{getTitle()}</div>
              <button className="close-btn" onClick={onClose}>✕</button>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    {t.firstName}<span>*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    className={`form-input ${errors.firstName ? 'error' : ''}`}
                    value={formData.firstName}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    {t.lastName}<span>*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    className={`form-input ${errors.lastName ? 'error' : ''}`}
                    value={formData.lastName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    {t.birthDate}<span>*</span>
                  </label>
                  <input
                    type="date"
                    name="birthDate"
                    className={`form-input ${errors.birthDate ? 'error' : ''}`}
                    value={formData.birthDate}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    {t.birthPlace}<span>*</span>
                  </label>
                  <input
                    type="text"
                    name="birthPlace"
                    className={`form-input ${errors.birthPlace ? 'error' : ''}`}
                    value={formData.birthPlace}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {service === 'lang' && (
                <div className="form-group">
                  <label className="form-label">
                    {t.langLevel}<span>*</span>
                  </label>
                  <select
                    name="langLevel"
                    className={`form-input ${errors.langLevel ? 'error' : ''}`}
                    value={formData.langLevel}
                    onChange={handleChange}
                    required
                  >
                    <option value="">{t.selectLevel}</option>
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(level => (
                      <option key={level} value={level}>
                        {t.levels[level]}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">
                  {t.phone}<span>*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="+213..."
                  className={`form-input ${errors.phone ? 'error' : ''}`}
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  {t.motivation} <span style={{color: 'rgba(255,255,255,0.5)', fontWeight: 400
