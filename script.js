/*!
 * Dental Zone Mianwali — site scripts
 * Header scroll state, scroll-reveal, reviews carousel,
 * FAQ accordion, language switcher, and WhatsApp-based
 * appointment booking with automatic doctor assignment.
 */
(function () {
  'use strict';

  /* =========================================================
     CONFIG
     ========================================================= */
  var CLINIC_PHONE_DISPLAY = '0300-6093493';

  /* =========================================================
     Header scroll state
     ========================================================= */
  var header = document.getElementById('site-header');
  window.addEventListener('scroll', function () {
    header.classList.toggle('scrolled', window.scrollY > 12);
  }, { passive: true });

  /* =========================================================
     Reduced motion preference
     ========================================================= */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =========================================================
     Scroll reveal
     ========================================================= */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('[data-animate]').forEach(function (el, i) {
    el.style.transitionDelay = reduceMotion ? '0s' : (i % 6) * 0.05 + 's';
    io.observe(el);
  });

  /* =========================================================
     Mark decorative icons as hidden from assistive tech
     ========================================================= */
  document.querySelectorAll('.service-icon svg, .info-row .ico svg, .why-row .check, .logo .mark svg')
    .forEach(function (el) { el.setAttribute('aria-hidden', 'true'); });

  /* =========================================================
     Testimonial slider
     ========================================================= */
  var slides = Array.prototype.slice.call(document.querySelectorAll('.t-slide'));
  var dotsWrap = document.getElementById('t-dots');
  var active = 0;
  var tInterval;

  if (slides.length && dotsWrap) {
    slides.forEach(function (_, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Show testimonial ' + (i + 1));
      if (i === 0) b.classList.add('active');
      b.addEventListener('click', function () { showSlide(i); });
      dotsWrap.appendChild(b);
    });

    function showSlide(i) {
      slides[active].classList.remove('active');
      dotsWrap.children[active].classList.remove('active');
      active = i;
      slides[active].classList.add('active');
      dotsWrap.children[active].classList.add('active');
    }

    function startAutoplay() {
      if (reduceMotion) return;
      tInterval = setInterval(function () { showSlide((active + 1) % slides.length); }, 5500);
    }

    startAutoplay();
    var slider = document.getElementById('t-slider');
    slider.addEventListener('mouseenter', function () { clearInterval(tInterval); });
    slider.addEventListener('mouseleave', startAutoplay);
  }

  /* =========================================================
     Doctor auto-assignment map (Service -> one or more Doctors)
     When a service is offered by exactly one doctor, that doctor is
     shown automatically. When more than one doctor offers the same
     service, a "Select Doctor" dropdown appears so the patient can
     choose between them.
     ========================================================= */
  var SERVICE_DOCTORS = {
    'Consultation': ['Dr. Hanif Niazi'],
    'Tooth Extraction': ['Dr. Hanif Niazi'],
    'Scaling and Polishing': ['Dr. Hanif Niazi', 'Dr. Saad Abdullah', 'Dr. Tehseen Khatoon'],
    'Tooth-Colored (Composite) Filling': ['Dr. Hanif Niazi'],
    'Silver (Amalgam) Filling': ['Dr. Hanif Niazi'],
    'Root Canal Treatment': ['Dr. Saad Abdullah'],
    'Braces': ['Dr. Arshad Malik'],
    'Invisible Aligners': ['Dr. Arshad Malik'],
    'Retainers': ['Dr. Arshad Malik'],
    'C-C Plate Partial Dentures': ['Dr. Saad Abdullah', 'Dr. Tehseen Khatoon'],
    'Complete Dentures': ['Dr. Saad Abdullah', 'Dr. Tehseen Khatoon']
  };

  var CLINIC_WHATSAPP = '923187520272'; // 0318-7520272 in international format, no + or leading 0

  /* =========================================================
     Appointment booking — WhatsApp submission
     ========================================================= */
  var form = document.getElementById('booking-form');
  if (form) {
    var submitBtn = form.querySelector('[data-submit-btn]');
    var statusBox = document.getElementById('form-status');
    var assignedBox = document.getElementById('assigned-doctor-box');
    var doctorSelectField = document.getElementById('doctor-select-field');
    var doctorSelect = document.getElementById('p-doctor');
    var fridayWarning = document.getElementById('friday-warning');
    var isSubmitting = false;
    var lastSubmitAt = 0;

    var fields = {
      name: form.querySelector('#p-name'),
      phone: form.querySelector('#p-phone'),
      service: form.querySelector('#p-service'),
      doctor: form.querySelector('#p-doctor'),
      date: form.querySelector('#p-date'),
      time: form.querySelector('#p-time'),
      honeypot: form.querySelector('#company')
    };

    function setFieldError(field, message) {
      var errorEl = document.getElementById(field.id + '-error');
      if (errorEl) errorEl.textContent = message || '';
      field.setAttribute('aria-invalid', message ? 'true' : 'false');
    }

    function sanitize(value) {
      return String(value || '').trim().replace(/[<>]/g, '');
    }

    function isValidPhone(value) {
      return /^[0-9+\-\s()]{7,16}$/.test(value);
    }

    function isFriday(dateStr) {
      if (!dateStr) return false;
      var d = new Date(dateStr + 'T00:00:00');
      return d.getDay() === 5; // 0 = Sunday ... 5 = Friday
    }

    function isPastDate(dateStr) {
      if (!dateStr) return false;
      var chosen = new Date(dateStr + 'T00:00:00');
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      return chosen < today;
    }

    function getCurrentLang() {
      return document.documentElement.getAttribute('lang') === 'ur' ? 'ur' : 'en';
    }

    function populateDoctorSelect(doctors) {
      if (!doctorSelect) return;
      var lang = getCurrentLang();
      doctorSelect.innerHTML = '';
      var placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = lang === 'ur' ? 'ایک ڈاکٹر منتخب کریں' : 'Choose a doctor';
      doctorSelect.appendChild(placeholder);
      doctors.forEach(function (name) {
        var opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        doctorSelect.appendChild(opt);
      });
    }

    function updateAssignedDoctor() {
      var service = fields.service.value;
      var doctors = SERVICE_DOCTORS[service];

      if (!doctors) {
        if (assignedBox) assignedBox.hidden = true;
        if (doctorSelectField) doctorSelectField.hidden = true;
        return;
      }

      if (doctors.length === 1) {
        // Exactly one doctor performs this service — auto-assign, no picker needed.
        if (assignedBox) {
          assignedBox.hidden = false;
          assignedBox.innerHTML = 'This appointment will be assigned to <strong>' + doctors[0] + '</strong>.';
        }
        if (doctorSelectField) doctorSelectField.hidden = true;
        if (doctorSelect) doctorSelect.value = '';
        if (fields.doctor) setFieldError(fields.doctor, '');
      } else {
        // More than one doctor offers this service — let the patient choose.
        if (assignedBox) assignedBox.hidden = true;
        if (doctorSelectField) doctorSelectField.hidden = false;
        populateDoctorSelect(doctors);
      }
    }

    function checkFriday() {
      var showWarning = isFriday(fields.date.value);
      if (fridayWarning) fridayWarning.classList.toggle('show', showWarning);
      return showWarning;
    }

    if (fields.service) {
      updateAssignedDoctor();
      fields.service.addEventListener('change', updateAssignedDoctor);
    }
    if (fields.date) {
      fields.date.addEventListener('change', checkFriday);
    }

    function showStatus(type, message) {
      statusBox.textContent = message;
      statusBox.className = 'form-status ' + type;
      statusBox.hidden = false;
    }

    function setLoading(loading) {
      isSubmitting = loading;
      submitBtn.disabled = loading;
      submitBtn.classList.toggle('is-loading', loading);
    }

    function validateForm(data) {
      var valid = true;

      if (!data.name) { setFieldError(fields.name, 'Full name is required.'); valid = false; }
      else setFieldError(fields.name, '');

      if (!data.phone) { setFieldError(fields.phone, 'Phone number is required.'); valid = false; }
      else if (!isValidPhone(data.phone)) { setFieldError(fields.phone, 'Enter a valid phone number.'); valid = false; }
      else setFieldError(fields.phone, '');

      if (!data.service) { setFieldError(fields.service, 'Please choose a service.'); valid = false; }
      else setFieldError(fields.service, '');

      if (!data.date) { setFieldError(fields.date, 'Please choose a preferred date.'); valid = false; }
      else if (isPastDate(data.date)) { setFieldError(fields.date, 'Please choose today or a future date.'); valid = false; }
      else setFieldError(fields.date, '');

      if (!data.time) { setFieldError(fields.time, 'Please choose a preferred time.'); valid = false; }
      else setFieldError(fields.time, '');

      if (doctorSelectField && !doctorSelectField.hidden) {
        if (!data.doctor) {
          if (fields.doctor) setFieldError(fields.doctor, 'Please choose a doctor.');
          valid = false;
        } else if (fields.doctor) {
          setFieldError(fields.doctor, '');
        }
      }

      return valid;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (isSubmitting) return;
      if (Date.now() - lastSubmitAt < 6000) {
        showStatus('error', 'Please wait a few seconds before trying again.');
        return;
      }

      var data = {
        name: sanitize(fields.name.value),
        phone: sanitize(fields.phone.value),
        service: fields.service.value,
        doctor: fields.doctor ? fields.doctor.value : '',
        date: sanitize(fields.date.value),
        time: sanitize(fields.time.value),
        honeypot: fields.honeypot ? fields.honeypot.value : ''
      };

      // Silent bot trap
      if (data.honeypot) {
        form.reset();
        showStatus('success', 'Appointment request submitted successfully.');
        return;
      }

      if (!validateForm(data)) {
        showStatus('error', 'Please fix the highlighted fields and try again.');
        return;
      }

      // Hard block: Friday is closed
      if (isFriday(data.date)) {
        checkFriday();
        showStatus('error', 'The clinic is closed on Fridays. Please select another date.');
        return;
      }

      var possibleDoctors = SERVICE_DOCTORS[data.service] || [];
      var doctor = possibleDoctors.length === 1 ? possibleDoctors[0] : (data.doctor || 'Our team');

      setLoading(true);
      statusBox.hidden = true;
      lastSubmitAt = Date.now();

      var message =
        'New Appointment\n' +
        'Patient Name: ' + data.name + '\n' +
        'Phone Number: ' + data.phone + '\n' +
        'Selected Service: ' + data.service + '\n' +
        'Assigned Doctor: ' + doctor + '\n' +
        'Preferred Date: ' + data.date + '\n' +
        'Preferred Time: ' + data.time;

      var waUrl = 'https://wa.me/' + CLINIC_WHATSAPP + '?text=' + encodeURIComponent(message);

      showStatus('success', 'Opening WhatsApp to confirm your appointment with ' + doctor + '…');
      window.open(waUrl, '_blank', 'noopener');

      setTimeout(function () {
        form.reset();
        if (assignedBox) assignedBox.hidden = true;
        if (doctorSelectField) doctorSelectField.hidden = true;
        if (fridayWarning) fridayWarning.classList.remove('show');
        setLoading(false);
      }, 900);
    });
  }

  /* =========================================================
     FAQ accordion
     ========================================================= */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var btn = item.querySelector('.faq-question');
    var answer = item.querySelector('.faq-answer');
    if (!btn || !answer) return;
    btn.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function (openItem) {
        openItem.classList.remove('open');
        openItem.querySelector('.faq-answer').style.maxHeight = null;
        openItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* =========================================================
     Language switcher (English / Urdu)
     ========================================================= */
  (function initLangSwitch() {
    var buttons = document.querySelectorAll('[data-lang-btn]');
    if (!buttons.length) return;

    function applyLang(lang) {
      document.querySelectorAll('[data-en]').forEach(function (el) {
        var text = lang === 'ur' ? el.getAttribute('data-ur') : el.getAttribute('data-en');
        if (text !== null) el.textContent = text;
      });
      document.body.classList.toggle('lang-ur', lang === 'ur');
      buttons.forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-lang-btn') === lang);
      });
      document.documentElement.setAttribute('lang', lang === 'ur' ? 'ur' : 'en');
    }

    buttons.forEach(function (b) {
      b.addEventListener('click', function () { applyLang(b.getAttribute('data-lang-btn')); });
    });
  })();
})();
