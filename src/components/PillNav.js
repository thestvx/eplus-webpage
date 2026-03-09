import { useState, useEffect, useRef } from 'react';

export default function PillNav({ onSelect, activeService, t }) {
  const [sliderStyle, setSliderStyle] = useState({});
  const navRef = useRef(null);
  const buttonsRef = useRef([]);

  const services = [
    { id: 'support', icon: '📚', label: t.btn1 },
    { id: 'lang', icon: '🌐', label: t.btn2 },
    { id: 'vip', icon: '⭐', label: t.btn3 }
  ];

  useEffect(() => {
    const activeIndex = services.findIndex(s => s.id === activeService);
    const activeBtn = buttonsRef.current[activeIndex];
    if (activeBtn && navRef.current) {
      const navRect = navRef.current.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      setSliderStyle({
        width: btnRect.width,
        transform: `translateX(${btnRect.left - navRect.left - 6}px)`
      });
    }
  }, [activeService, services]);

  return (
    <nav className="pill-nav" ref={navRef}>
      <div className="pill-slider" style={sliderStyle} />
      {services.map((service, index) => (
        <button
          key={service.id}
          ref={el => buttonsRef.current[index] = el}
          className={`pill-btn ${activeService === service.id ? 'active' : ''}`}
          onClick={() => onSelect(service.id)}
        >
          <span className="pill-icon">{service.icon}</span>
          <span className="pill-label">{service.label}</span>
        </button>
      ))}
    </nav>
  );
}
