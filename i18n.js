// EN/ES translation toggle. Flat dictionary keyed by "page.element" strings
// (no nested objects -- easier to grep for a missing key than to walk a
// path). Elements opt in via data-i18n (innerHTML), data-i18n-alt,
// data-i18n-aria, or data-i18n-placeholder (attribute swap). Selection
// persists in localStorage so it survives page-to-page navigation.
//
// Rollout is intentionally partial: this file is included on every page
// (including registration.html) so the header/footer toggle always works,
// but only the marketing pages (index, dr-scuteri, provider-referral) have
// their body content tagged with data-i18n so far. Untagged pages simply
// keep showing English text when ES is selected until they're tagged too.
var I18N_DICT = {
  // ── COMMON (header / footer / call button -- shared partials, all pages) ──
  "common.nav_home": { en: "Home", es: "Inicio" },
  "common.nav_about": { en: "Meet Dr. Scuteri", es: "Conozca al Dr. Scuteri" },
  "common.nav_registration": { en: "New Patient Registration", es: "Registro de Nuevo Paciente" },
  "common.hamburger_aria": { en: "Menu", es: "Menú" },
  "common.lang_toggle_aria": { en: "Switch language", es: "Cambiar idioma" },
  "common.callfab_label": { en: "Call Us", es: "Llámenos" },
  "common.callfab_aria": { en: "Call Us", es: "Llámenos" },

  // ── RELOCATION / TELEMEDICINE BANNER (home page only) ──
  "banner.text": { en: "Important Update Regarding Our Office Relocation &amp; Telemedicine Visits", es: "Actualización Importante sobre la Reubicación de Nuestra Oficina y las Visitas de Telemedicina" },
  "banner.readmore": { en: "Read More", es: "Leer Más" },
  "banner.showless": { en: "Show Less", es: "Leer Menos" },
  "banner.p1": { en: "During this transition, we remain committed to providing uninterrupted care. You can continue to schedule appointments, discuss your sleep concerns, review test results, and receive treatment recommendations through secure telemedicine visits.", es: "Durante esta transición, seguimos comprometidos a brindar atención ininterrumpida. Usted puede continuar programando citas, hablar sobre sus inquietudes de sueño, revisar resultados de exámenes y recibir recomendaciones de tratamiento a través de consultas seguras de telemedicina." },
  "banner.p2": { en: "As of July 24, all patient appointments will be conducted via telemedicine while we relocate our office to better serve you.", es: "A partir del 24 de julio, todas las citas de pacientes se realizarán por telemedicina mientras reubicamos nuestra oficina para servirle mejor." },
  "banner.p3": { en: "<strong>Important Update for Medicare Patients:</strong> We are pleased to announce that we can now continue seeing Medicare patients via telemedicine, as the current Medicare telehealth guidelines have been extended through December 2027.", es: "<strong>Actualización Importante para Pacientes de Medicare:</strong> Nos complace anunciar que ahora podemos continuar atendiendo a los pacientes de Medicare por telemedicina, ya que las pautas actuales de telesalud de Medicare se han extendido hasta diciembre de 2027." },
  "banner.p4": { en: "Medicare patients may schedule and complete their appointments through telemedicine during our office relocation, just like our other patients.", es: "Los pacientes de Medicare pueden programar y completar sus citas por telemedicina durante la reubicación de nuestra oficina, al igual que nuestros demás pacientes." },
  "banner.p5": { en: "Once our relocation is complete, we will announce the reopening of our office and begin scheduling in-person appointments.", es: "Una vez que finalice nuestra reubicación, anunciaremos la reapertura de nuestra oficina y comenzaremos a programar citas en persona." },
  "banner.p6": { en: "We appreciate your patience and understanding during this transition and look forward to continuing to care for your sleep health. If you have any questions or would like to schedule an appointment, please contact our office.", es: "Agradecemos su paciencia y comprensión durante esta transición, y esperamos seguir cuidando la salud de su sueño. Si tiene alguna pregunta o desea programar una cita, comuníquese con nuestra oficina." },

  // ── HOME (index.html) ──
  "home.tabs_eyebrow": { en: "What We Offer", es: "Lo Que Ofrecemos" },
  "home.tabs_title": { en: "Services &amp; Insurance Coverage", es: "Servicios y Cobertura de Seguro" },
  "home.tabs_desc": { en: "Explore our full range of physician-supervised services and verify your insurance coverage below.", es: "Explore nuestra gama completa de servicios supervisados por médicos y verifique su cobertura de seguro a continuación." },
  "home.tabs_btn_services": { en: "Services Offered", es: "Servicios Ofrecidos" },
  "home.tabs_btn_insurance": { en: "Insurances Accepted", es: "Seguros Aceptados" },

  "home.svc_th_service": { en: "Service", es: "Servicio" },
  "home.svc_th_desc": { en: "Description &amp; Highlights", es: "Descripción y Aspectos Destacados" },

  "home.svc_sleep_name": { en: "Sleep Medicine", es: "Medicina del Sueño" },
  "home.svc_sleep_desc": { en: "Board-certified physicians diagnosing and treating the full spectrum of sleep disorders. State-of-the-art diagnostics with personalized treatment plans to restore healthy, restorative sleep.", es: "Médicos certificados por la junta que diagnostican y tratan todo el espectro de trastornos del sueño. Diagnósticos de vanguardia con planes de tratamiento personalizados para restaurar un sueño saludable y reparador." },
  "home.svc_sleep_tag1": { en: "Sleep Apnea (OSA &amp; CSA)", es: "Apnea del Sueño (OSA y CSA)" },
  "home.svc_sleep_tag3": { en: "In-Lab Sleep Study", es: "Estudio del Sueño en Laboratorio" },
  "home.svc_sleep_tag4": { en: "Home Sleep Testing", es: "Prueba de Sueño en Casa" },
  "home.svc_sleep_tag5": { en: "Insomnia", es: "Insomnio" },
  "home.svc_sleep_tag6": { en: "Narcolepsy", es: "Narcolepsia" },
  "home.svc_sleep_tag7": { en: "Restless Legs Syndrome", es: "Síndrome de Piernas Inquietas" },
  "home.svc_sleep_tag9": { en: "Circadian Rhythm", es: "Ritmo Circadiano" },
  "home.svc_sleep_tag10": { en: "Pediatric Sleep", es: "Sueño Pediátrico" },

  "home.svc_weight_name": { en: "Weight Loss Program", es: "Programa de Pérdida de Peso" },
  "home.svc_weight_desc": { en: "Our Tirzepatide program combines clinically proven GLP-1/GIP receptor agonist injections with physician oversight, nutritional guidance, and lifestyle coaching for sustainable, real results.", es: "Nuestro programa de Tirzepatida combina inyecciones agonistas del receptor GLP-1/GIP, clínicamente comprobadas, con supervisión médica, orientación nutricional y asesoría de estilo de vida para lograr resultados reales y sostenibles." },
  "home.svc_weight_tag1": { en: "Tirzepatide Injections", es: "Inyecciones de Tirzepatida" },
  "home.svc_weight_tag2": { en: "Medical Evaluation &amp; Labs", es: "Evaluación Médica y Laboratorios" },
  "home.svc_weight_tag3": { en: "Personalized Plan", es: "Plan Personalizado" },
  "home.svc_weight_tag4": { en: "Monthly Monitoring", es: "Monitoreo Mensual" },
  "home.svc_weight_tag5": { en: "Nutrition Coaching", es: "Asesoría Nutricional" },
  "home.svc_weight_tag6": { en: "Physician Supervised", es: "Supervisado por Médico" },

  "home.svc_iv_name": { en: "IV Therapy", es: "Terapia Intravenosa" },
  "home.svc_iv_desc": { en: "Vitamins, minerals, and hydration delivered directly into the bloodstream for maximum absorption and fast results. Each infusion is customized by our clinical team to meet your specific needs.", es: "Vitaminas, minerales e hidratación administrados directamente al torrente sanguíneo para una absorción máxima y resultados rápidos. Cada infusión es personalizada por nuestro equipo clínico según sus necesidades específicas." },
  "home.svc_iv_tag1": { en: "Hydration Therapy", es: "Terapia de Hidratación" },
  "home.svc_iv_tag2": { en: "Vitamin C Infusion", es: "Infusión de Vitamina C" },
  "home.svc_iv_tag3": { en: "B-Complex &amp; B12", es: "Complejo B y B12" },
  "home.svc_iv_tag4": { en: "Immunity Support", es: "Apoyo Inmunológico" },
  "home.svc_iv_tag5": { en: "Myers' Cocktail", es: "Cóctel de Myers" },
  "home.svc_iv_tag6": { en: "NAD+ Therapy", es: "Terapia con NAD+" },
  "home.svc_iv_tag7": { en: "Custom Wellness Blends", es: "Mezclas de Bienestar Personalizadas" },

  "home.svc_wellness_name": { en: "Wellness &amp; More", es: "Bienestar y Más" },
  "home.svc_wellness_desc": { en: "Whole-person care beyond our core services &mdash; a growing range of wellness treatments and consultations designed to support your long-term health journey.", es: "Atención integral más allá de nuestros servicios principales: una gama creciente de tratamientos y consultas de bienestar diseñados para apoyar su camino de salud a largo plazo." },
  "home.svc_wellness_tag1": { en: "Wellness Consultations", es: "Consultas de Bienestar" },
  "home.svc_wellness_tag2": { en: "Longevity Medicine", es: "Medicina de la Longevidad" },
  "home.svc_wellness_tag3": { en: "Hormone Evaluation", es: "Evaluación Hormonal" },
  "home.svc_wellness_tag4": { en: "Annual Wellness Exams", es: "Exámenes Anuales de Bienestar" },
  "home.svc_wellness_tag5": { en: "Preventive Screenings", es: "Exámenes Preventivos" },
  "home.svc_wellness_tag6": { en: "Telehealth Visits", es: "Consultas de Telesalud" },

  "home.ins_th": { en: "Currently Accepted Insurance Carriers", es: "Aseguradoras Aceptadas Actualmente" },
  "home.ins_selfpay": { en: "Self-Pay / Uninsured", es: "Pago Directo / Sin Seguro" },
  "home.ins_badge": { en: "Now Accepting New Patients", es: "Aceptando Nuevos Pacientes" },
  "home.ins_note_title": { en: "Questions About Your Coverage?", es: "¿Preguntas Sobre su Cobertura?" },
  "home.ins_note_p1": { en: "We accept most major insurance plans. Coverage and benefits vary by plan. Our billing team is happy to verify your insurance benefits before your visit.", es: "Aceptamos la mayoría de los planes de seguro principales. La cobertura y los beneficios varían según el plan. Nuestro equipo de facturación con gusto verificará sus beneficios de seguro antes de su visita." },
  "home.ins_note_p2": { en: 'Contact us at <strong style="color:var(--dg)">727-472-9112</strong> and we will work with you to understand your coverage, co-pays, and out-of-pocket costs.', es: 'Comuníquese con nosotros al <strong style="color:var(--dg)">727-472-9112</strong> y trabajaremos con usted para entender su cobertura, copagos y costos de bolsillo.' },
  "home.ins_note_p3": { en: "We believe finances should never be a barrier to good health.", es: "Creemos que las finanzas nunca deben ser una barrera para la buena salud." },

  "home.about_eyebrow": { en: "Who We Are", es: "Quiénes Somos" },
  "home.about_title": { en: "About West Coast Sleep Clinic", es: "Sobre West Coast Sleep Clinic" },
  "home.about_p1": { en: "At West Coast Sleep Clinic, we are committed to improving the lives of our patients through expert sleep medicine, innovative wellness programs, and compassionate, personalized care.", es: "En West Coast Sleep Clinic, estamos comprometidos a mejorar la vida de nuestros pacientes a través de medicina del sueño experta, programas de bienestar innovadores y atención compasiva y personalizada." },
  "home.about_p2": { en: "Sleep is the foundation of good health. When you sleep better, you feel better, think more clearly, and live more fully. Our team of board-certified physicians and dedicated clinical staff work together to ensure every patient receives the individualized attention and care they deserve.", es: "El sueño es la base de una buena salud. Cuando usted duerme mejor, se siente mejor, piensa con más claridad y vive más plenamente. Nuestro equipo de médicos certificados por la junta y personal clínico dedicado trabaja en conjunto para garantizar que cada paciente reciba la atención individualizada que merece." },
  "home.about_p3": { en: "Founded in 2023 and located in Largo, Florida, West Coast Sleep Clinic is proud to serve patients throughout Pinellas County and the surrounding Tampa Bay region.", es: "Fundada en 2023 y ubicada en Largo, Florida, West Coast Sleep Clinic se enorgullece de atender a pacientes en todo el condado de Pinellas y la región circundante de Tampa Bay." },

  "home.info_title": { en: "Practice Information", es: "Información de la Práctica" },
  "home.info_location_lbl": { en: "Location", es: "Ubicación" },
  "home.info_location_val": { en: "TBD", es: "Por Confirmar" },
  "home.info_phone_lbl": { en: "Phone / Text", es: "Teléfono / Mensaje de Texto" },
  "home.info_hours_lbl": { en: "Hours", es: "Horario" },
  "home.info_hours_val": { en: "Hours vary. New patients: schedule online via New Patient Registration. Existing patients: please call to schedule follow-ups.", es: "El horario varía. Pacientes nuevos: programen su cita en línea a través de Registro de Nuevo Paciente. Pacientes actuales: llamen para programar seguimientos." },
  "home.info_founded_lbl": { en: "Founded", es: "Fundada" },
  "home.info_telehealth_lbl": { en: "Telehealth", es: "Telesalud" },
  "home.info_telehealth_val": { en: "Available", es: "Disponible" },

  "home.promise_eyebrow": { en: "Our Promise", es: "Nuestro Compromiso" },
  "home.promise_title": { en: "Why Choose West Coast Sleep Clinic?", es: "¿Por Qué Elegir West Coast Sleep Clinic?" },
  "home.promise_card1_title": { en: "Expert Care", es: "Atención Experta" },
  "home.promise_card1_desc": { en: "Board-certified physicians providing the highest standard of evidence-based clinical care for every patient, every visit.", es: "Médicos certificados por la junta que brindan el más alto estándar de atención clínica basada en evidencia para cada paciente, en cada visita." },
  "home.promise_card2_title": { en: "Personalized Solutions", es: "Soluciones Personalizadas" },
  "home.promise_card2_desc": { en: "Every patient is unique. We design individualized treatment plans tailored to your specific needs, goals, and lifestyle.", es: "Cada paciente es único. Diseñamos planes de tratamiento individualizados, adaptados a sus necesidades, objetivos y estilo de vida específicos." },
  "home.promise_card3_title": { en: "Your Health, Our Priority", es: "Su Salud, Nuestra Prioridad" },
  "home.promise_card3_desc": { en: "Your long-term health, comfort, and wellbeing are at the center of every decision we make. We are committed to real, lasting results.", es: "Su salud, comodidad y bienestar a largo plazo están en el centro de cada decisión que tomamos. Estamos comprometidos con resultados reales y duraderos." },

  // ── ABOUT (dr-scuteri.html) ──
  "about.title_line": { en: "Founder &nbsp;&middot;&nbsp; Physician &nbsp;&middot;&nbsp; Sleep Medicine Specialist", es: "Fundador &nbsp;&middot;&nbsp; Médico &nbsp;&middot;&nbsp; Especialista en Medicina del Sueño" },
  "about.credential_line": { en: "Double Board-Certified in Sleep Medicine &amp; Family Medicine", es: "Doble Certificación en Medicina del Sueño y Medicina Familiar" },
  "about.cred_board_certified": { en: "Board-Certified", es: "Certificado por la Junta" },
  "about.cred_sleep_medicine": { en: "Sleep Medicine", es: "Medicina del Sueño" },
  "about.cred2_title": { en: "Family Medicine", es: "Medicina Familiar" },
  "about.cred3_label": { en: "Fellowship Training", es: "Formación de Subespecialidad (Fellowship)" },
  "about.quote": { en: "Sleep is one of the greatest mysteries left in medicine. We know it influences nearly every system in the body — the brain, heart, hormones, metabolism, immune system, and even longevity. Yet we&rsquo;re still discovering why sleep is so essential. That mystery drew me into this field, and every day I continue learning something new.", es: "El sueño es uno de los mayores misterios que quedan en la medicina. Sabemos que influye en casi todos los sistemas del cuerpo: el cerebro, el corazón, las hormonas, el metabolismo, el sistema inmunológico e incluso la longevidad. Sin embargo, todavía estamos descubriendo por qué el sueño es tan esencial. Ese misterio fue lo que me atrajo a este campo, y cada día sigo aprendiendo algo nuevo." },

  "about.bio_title": { en: "About Dr. Bryan Scuteri", es: "Sobre el Dr. Bryan Scuteri" },
  "about.bio_p1": { en: "Dr. Bryan Scuteri is a double board-certified physician in Sleep Medicine and Family Medicine and the founder of West Coast Sleep Clinic in Largo, Florida. His approach to medicine is built on a simple belief: people deserve to understand why they don&rsquo;t feel well&mdash;not just receive another prescription.", es: "El Dr. Bryan Scuteri es un médico con doble certificación de la junta en Medicina del Sueño y Medicina Familiar, y fundador de West Coast Sleep Clinic en Largo, Florida. Su enfoque de la medicina se basa en una creencia sencilla: las personas merecen entender por qué no se sienten bien, no solo recibir otra receta." },
  "about.bio_p2": { en: "After completing his residency in Family Medicine, Dr. Scuteri pursued fellowship training in Sleep Medicine at Louisiana State University, graduating in 2019. It was there that a lifelong fascination became a career.", es: "Después de completar su residencia en Medicina Familiar, el Dr. Scuteri realizó su formación de subespecialidad en Medicina del Sueño en Louisiana State University, graduándose en 2019. Fue allí donde una fascinación de toda la vida se convirtió en una carrera." },
  "about.bio_p3": { en: "To Dr. Scuteri, sleep medicine is far more than diagnosing sleep apnea or interpreting sleep studies. It is understanding the person behind the symptoms. Fatigue, poor concentration, weight gain, low motivation, depression, memory problems, and chronic health conditions are often deeply connected, and finding those connections is what he enjoys most.", es: "Para el Dr. Scuteri, la medicina del sueño es mucho más que diagnosticar apnea del sueño o interpretar estudios del sueño. Se trata de entender a la persona detrás de los síntomas. La fatiga, la falta de concentración, el aumento de peso, la baja motivación, la depresión, los problemas de memoria y las condiciones de salud crónicas suelen estar profundamente conectados, y encontrar esas conexiones es lo que más disfruta." },
  "about.bio_p4": { en: "Since opening West Coast Sleep Clinic, Dr. Scuteri has cared for patients with the full spectrum of sleep disorders, including obstructive and central sleep apnea, insomnia, narcolepsy, restless legs syndrome, parasomnias, and circadian rhythm disorders. His philosophy has always been rooted in evidence-based medicine, compassionate listening, and individualized care.", es: "Desde la apertura de West Coast Sleep Clinic, el Dr. Scuteri ha atendido a pacientes con todo el espectro de trastornos del sueño, incluyendo apnea obstructiva y central del sueño, insomnio, narcolepsia, síndrome de piernas inquietas, parasomnias y trastornos del ritmo circadiano. Su filosofía siempre se ha basado en la medicina basada en evidencia, la escucha compasiva y la atención individualizada." },
  "about.bio_p5": { en: "Some of the most rewarding moments in his career happen long after the sleep study is over.", es: "Algunos de los momentos más gratificantes de su carrera ocurren mucho después de que termina el estudio del sueño." },
  "about.pullquote1": { en: "&ldquo;I&rsquo;ve watched parents regain the energy to play with their children. I&rsquo;ve seen patients rediscover the focus they thought they&rsquo;d lost forever. Others tell me they finally enjoy retirement, succeed at work again, or simply wake up feeling like themselves for the first time in years. Those moments remind me why I chose this profession.&rdquo;", es: "&ldquo;He visto a padres recuperar la energía para jugar con sus hijos. He visto a pacientes redescubrir la concentración que creían haber perdido para siempre. Otros me cuentan que finalmente disfrutan de su jubilación, que vuelven a tener éxito en el trabajo, o que simplemente se despiertan sintiéndose ellos mismos por primera vez en años. Esos momentos me recuerdan por qué elegí esta profesión.&rdquo;" },
  "about.bio_p6": { en: "Over time, Dr. Scuteri recognized that restoring healthy sleep often requires addressing the conditions that contribute to poor sleep in the first place. Obesity, metabolic dysfunction, hormonal changes, inflammation, and lifestyle all influence how well the body sleeps&mdash;and how well it heals.", es: "Con el tiempo, el Dr. Scuteri reconoció que restaurar un sueño saludable a menudo requiere abordar las condiciones que contribuyen a un sueño deficiente en primer lugar. La obesidad, la disfunción metabólica, los cambios hormonales, la inflamación y el estilo de vida influyen en la calidad del sueño del cuerpo, y en su capacidad de sanar." },
  "about.bio_p7": { en: "That realization naturally expanded West Coast Sleep Clinic into a center focused on both sleep medicine and health optimization. Medical weight management, including GLP-1 therapy, hormone optimization for appropriately selected patients, and other evidence-based wellness treatments are offered as part of a comprehensive approach to improving health&mdash;not as standalone trends or quick fixes.", es: "Esa comprensión llevó naturalmente a que West Coast Sleep Clinic se convirtiera en un centro enfocado tanto en la medicina del sueño como en la optimización de la salud. El manejo médico del peso, incluyendo la terapia con GLP-1, la optimización hormonal para pacientes debidamente seleccionados, y otros tratamientos de bienestar basados en evidencia se ofrecen como parte de un enfoque integral para mejorar la salud, y no como tendencias aisladas o soluciones rápidas." },
  "about.pullquote2": { en: "&ldquo;I don&rsquo;t believe in treating isolated diagnoses. I believe in helping people restore their health. Better sleep improves overall health, and better overall health almost always improves sleep. When we address both together, we can often change someone&rsquo;s quality of life in ways they never thought possible.&rdquo;", es: "&ldquo;No creo en tratar diagnósticos aislados. Creo en ayudar a las personas a restaurar su salud. Un mejor sueño mejora la salud en general, y una mejor salud en general casi siempre mejora el sueño. Cuando abordamos ambos juntos, a menudo podemos cambiar la calidad de vida de una persona de maneras que nunca creyó posible.&rdquo;" },
  "about.bio_p8": { en: "Whether caring for someone struggling with severe sleep apnea, chronic fatigue, unexplained daytime sleepiness, or helping patients optimize their long-term health, Dr. Scuteri&rsquo;s mission remains the same:", es: "Ya sea atendiendo a alguien que lucha contra la apnea del sueño severa, la fatiga crónica, la somnolencia diurna inexplicable, o ayudando a los pacientes a optimizar su salud a largo plazo, la misión del Dr. Scuteri sigue siendo la misma:" },

  "about.mission_eyebrow": { en: "Mission", es: "Misión" },
  "about.mission_quote": { en: "To help people reclaim their energy, restore their health, and live life to its fullest.", es: "Ayudar a las personas a recuperar su energía, restaurar su salud y vivir la vida al máximo." },
  "about.mission_close": { en: "Because when people sleep better, they don&rsquo;t just rest better&mdash;they live better.", es: "Porque cuando las personas duermen mejor, no solo descansan mejor: viven mejor." },

  // ── REFERRAL (provider-referral.html) ──
  "referral.page_title": { en: "Provider Referral Intake", es: "Recepción de Referencias de Proveedores" },
  "referral.page_desc": { en: "Securely submit patient referral documents to West Coast Sleep Clinic", es: "Envíe de forma segura los documentos de referencia del paciente a West Coast Sleep Clinic" },
  "referral.disc_p1": { en: "Thank you for referring your patient to West Coast Sleep Clinic. We appreciate your referral and look forward to providing excellent care.", es: "Gracias por referir a su paciente a West Coast Sleep Clinic. Agradecemos su referencia y esperamos brindar una atención excelente." },
  "referral.disc_p2": { en: "To help us schedule your patient's appointment as quickly as possible, please upload the following:", es: "Para ayudarnos a programar la cita de su paciente lo más pronto posible, suba lo siguiente:" },
  "referral.disc_li1": { en: "Patient demographics (including contact information and insurance)", es: "Datos demográficos del paciente (incluyendo información de contacto y seguro)" },
  "referral.disc_li2": { en: "Provider referral/order", es: "Orden/referencia del proveedor" },
  "referral.disc_li3": { en: "Relevant medical records (if available)", es: "Registros médicos relevantes (si están disponibles)" },
  "referral.disc_p3": { en: "Please note: A provider referral is required for patients with HMO insurance plans and may also be required by other insurance plans before an appointment can be scheduled.", es: "Tenga en cuenta: se requiere una referencia del proveedor para pacientes con planes de seguro HMO, y también puede ser requerida por otros planes de seguro antes de poder programar una cita." },
  "referral.disc_p4": { en: "Once all required documents have been received, our scheduling team will contact the patient promptly to arrange their appointment.", es: "Una vez recibidos todos los documentos requeridos, nuestro equipo de programación se pondrá en contacto con el paciente de inmediato para coordinar su cita." },
  "referral.disc_p5": { en: "Thank you for trusting West Coast Sleep Clinic with your patient's care.", es: "Gracias por confiar en West Coast Sleep Clinic para el cuidado de su paciente." },
  "referral.upload_btn": { en: "Click Here to Upload Files", es: "Haga Clic Aquí para Subir Archivos" },

  "referral.done_title": { en: "Documents Received", es: "Documentos Recibidos" },
  "referral.done_p1": { en: "Thank you. Your referral documents have been successfully submitted to West Coast Sleep Clinic.", es: "Gracias. Sus documentos de referencia se enviaron exitosamente a West Coast Sleep Clinic." },
  "referral.done_p2": { en: "Our scheduling team will contact the patient promptly to arrange their appointment.", es: "Nuestro equipo de programación se pondrá en contacto con el paciente de inmediato para coordinar su cita." },
  "referral.return_home": { en: "Return to Home", es: "Volver al Inicio" },

  "referral.modal_title": { en: "Upload Referral Documents", es: "Subir Documentos de Referencia" },
  "referral.patient_info": { en: "Patient Information", es: "Información del Paciente" },
  "referral.first_name": { en: "First Name", es: "Nombre" },
  "referral.last_name": { en: "Last Name", es: "Apellido" },
  "referral.dob": { en: "Date of Birth", es: "Fecha de Nacimiento" },
  "referral.first_name_ph": { en: "Patient's first name", es: "Nombre del paciente" },
  "referral.last_name_ph": { en: "Patient's last name", es: "Apellido del paciente" },
  "referral.upload_docs_lbl": { en: "Upload Documents", es: "Subir Documentos" },
  "referral.dropzone_text": { en: "Drag &amp; drop files here", es: "Arrastre y suelte los archivos aquí" },
  "referral.or": { en: "or", es: "o" },
  "referral.browse_btn": { en: "Browse from Device", es: "Buscar en el Dispositivo" },
  "referral.cancel_btn": { en: "Cancel", es: "Cancelar" },
  "referral.submit_btn": { en: "Submit Documents", es: "Enviar Documentos" },

  // Dynamic strings set from JS (via t()), not tagged in markup
  "referral.uploading": { en: "Uploading…", es: "Subiendo…" },
  "referral.upload_err_prefix": { en: "Unable to upload. Please call us at 727-472-9112 or try again. (", es: "No se pudo subir. Llámenos al 727-472-9112 o intente de nuevo. (" },

  // ── COMMON: calendar month/nav names, shared by date-picker.js and
  // slot-picker.js (both read these via t() rather than keeping their own
  // hardcoded English arrays) ──
  "common.month1": { en: "January", es: "Enero" },
  "common.month2": { en: "February", es: "Febrero" },
  "common.month3": { en: "March", es: "Marzo" },
  "common.month4": { en: "April", es: "Abril" },
  "common.month5": { en: "May", es: "Mayo" },
  "common.month6": { en: "June", es: "Junio" },
  "common.month7": { en: "July", es: "Julio" },
  "common.month8": { en: "August", es: "Agosto" },
  "common.month9": { en: "September", es: "Septiembre" },
  "common.month10": { en: "October", es: "Octubre" },
  "common.month11": { en: "November", es: "Noviembre" },
  "common.month12": { en: "December", es: "Diciembre" },
  "common.dpk_prev_month": { en: "Previous month", es: "Mes anterior" },
  "common.dpk_next_month": { en: "Next month", es: "Mes siguiente" },
  "common.dpk_su": { en: "Su", es: "Do" },
  "common.dpk_mo": { en: "Mo", es: "Lu" },
  "common.dpk_tu": { en: "Tu", es: "Ma" },
  "common.dpk_we": { en: "We", es: "Mi" },
  "common.dpk_th": { en: "Th", es: "Ju" },
  "common.dpk_fr": { en: "Fr", es: "Vi" },
  "common.dpk_sa": { en: "Sa", es: "Sá" },
  // Single-letter weekday header used only by slot-picker.js's calendar grid
  // -- kept separate from the two-letter dpk_* set above because the
  // conventional Spanish single-letter week (D L M X J V S) uses X for
  // Miércoles specifically to avoid colliding with Martes' M.
  "common.wk_su": { en: "S", es: "D" },
  "common.wk_mo": { en: "M", es: "L" },
  "common.wk_tu": { en: "T", es: "M" },
  "common.wk_we": { en: "W", es: "X" },
  "common.wk_th": { en: "T", es: "J" },
  "common.wk_fr": { en: "F", es: "V" },
  "common.wk_sa": { en: "S", es: "S" },

  // ── SHARED UPLOAD WIDGET (upload-widget.js -- registration.html Step 6 +
  // provider-referral.html) ──
  "upload.unsupported_prefix": { en: "Unsupported file type — ", es: "Tipo de archivo no compatible — " },
  "upload.unsupported_suffix": { en: ". Accepted types: Word, PDF, Excel, PNG, JPEG.", es: ". Tipos aceptados: Word, PDF, Excel, PNG, JPEG." },
  "upload.file_selected": { en: "file selected", es: "archivo seleccionado" },
  "upload.files_selected": { en: "files selected", es: "archivos seleccionados" },
  "upload.remove_file_aria": { en: "Remove file", es: "Eliminar archivo" },

  // ── REGISTRATION: shared header / stepper / treatment-type modal ──
  "reg.header_title": { en: "New Patient Registration", es: "Registro de Nuevo Paciente" },
  "reg.header_welcome": { en: "Welcome to West Coast Sleep Clinic!", es: "¡Bienvenido a West Coast Sleep Clinic!" },
  "reg.header_instructions": { en: "Please complete all forms below. Use the Next button to proceed through each step.", es: "Complete todos los formularios a continuación. Use el botón Siguiente para avanzar por cada paso." },
  "reg.step1": { en: "Reason for Appointment", es: "Motivo de la Cita" },
  "reg.step2": { en: "Patient Demographics", es: "Datos Demográficos del Paciente" },
  "reg.step3": { en: "Consents &amp; Signatures", es: "Consentimientos y Firmas" },
  "reg.step4": { en: "Medical Record Request", es: "Solicitud de Registros Médicos" },
  "reg.step5": { en: "Schedule Appointment", es: "Programar Cita" },
  "reg.step6": { en: "Review &amp; Submit", es: "Revisar y Enviar" },
  "reg.tt_modal_title": { en: "What kind of treatment are you interested in?", es: "¿Qué tipo de tratamiento le interesa?" },
  "reg.tt_sleep_title": { en: "Sleep Medicine", es: "Medicina del Sueño" },
  "reg.tt_sleep_sub": { en: "Evaluation for snoring, insomnia, or other sleep concerns", es: "Evaluación de ronquidos, insomnio u otras inquietudes del sueño" },
  "reg.tt_weight_title": { en: "Weight Loss", es: "Pérdida de Peso" },
  "reg.tt_weight_sub": { en: "Medical weight management program", es: "Programa médico de manejo de peso" },
  "reg.selected_lbl": { en: "Selected:", es: "Seleccionado:" },
  "reg.none_selected": { en: "None selected", es: "Ninguno seleccionado" },
  "reg.change_btn": { en: "Change", es: "Cambiar" },
  "reg.weight_loss_note": { en: "No additional questionnaire is required for the Weight Loss program. Click Next to continue with your registration.", es: "No se requiere un cuestionario adicional para el programa de Pérdida de Peso. Haga clic en Siguiente para continuar con su registro." },
  "reg.back_btn": { en: "&larr; Back", es: "&larr; Atrás" },

  // ── STEP 1: Reason for Appointment / intake questionnaire ──
  "reg.s1_treatment_type_ttl": { en: "Treatment Type", es: "Tipo de Tratamiento" },
  "reg.s1_chief_ttl": { en: "Chief Complaint &amp; Sleep History", es: "Motivo Principal e Historial de Sueño" },
  "reg.s1_chief_q": { en: "What is your main reason for visiting today?", es: "¿Cuál es el motivo principal de su visita hoy?" },
  "reg.s1_chief_ph": { en: "Describe your main concern or reason for your visit...", es: "Describa su inquietud principal o el motivo de su visita..." },
  "reg.s1_sleep_hrs_q": { en: "How many hours of sleep do you get per night?", es: "¿Cuántas horas de sueño duerme por noche?" },
  "reg.s1_duration_q": { en: "How long have you had this concern?", es: "¿Desde hace cuánto tiempo tiene esta inquietud?" },
  "reg.s1_duration_ph": { en: "e.g. 6 months, 2 years", es: "ej. 6 meses, 2 años" },
  "reg.s1_bedtime_lbl": { en: "Usual bedtime", es: "Hora habitual de acostarse" },
  "reg.s1_waketime_lbl": { en: "Usual wake time", es: "Hora habitual de despertarse" },
  "reg.s1_symptoms_lbl": { en: "Sleep Symptoms (check all that apply)", es: "Síntomas del Sueño (marque todos los que correspondan)" },
  "reg.s1_sym1": { en: "Difficulty falling asleep", es: "Dificultad para conciliar el sueño" },
  "reg.s1_sym2": { en: "Waking up frequently during the night", es: "Despertarse frecuentemente durante la noche" },
  "reg.s1_sym3": { en: "Waking up too early and unable to return to sleep", es: "Despertarse demasiado temprano y no poder volver a dormir" },
  "reg.s1_sym4": { en: "Snoring", es: "Ronquidos" },
  "reg.s1_sym5": { en: "Witnessed pauses in breathing or gasping", es: "Pausas en la respiración o jadeos observados por otra persona" },
  "reg.s1_sym6": { en: "Not feeling refreshed after sleep", es: "No sentirse descansado después de dormir" },
  "reg.s1_sym7": { en: "Excessive daytime sleepiness", es: "Somnolencia diurna excesiva" },
  "reg.s1_sym8": { en: "Restless legs or uncomfortable leg sensations at night", es: "Piernas inquietas o sensaciones incómodas en las piernas durante la noche" },
  "reg.s1_sym9": { en: "Teeth grinding or jaw clenching during sleep", es: "Rechinar los dientes o apretar la mandíbula durante el sueño" },
  "reg.s1_sym10": { en: "Sleepwalking or talking in sleep", es: "Sonambulismo o hablar dormido" },
  "reg.s1_prev_study_q": { en: "Have you had a sleep study before?", es: "¿Se ha realizado un estudio del sueño antes?" },
  "reg.s1_cpap_q": { en: "Do you currently use CPAP or BiPAP?", es: "¿Usa actualmente CPAP o BiPAP?" },
  "reg.yes": { en: "Yes", es: "Sí" },
  "reg.no": { en: "No", es: "No" },
  "reg.s1_ess_ttl": { en: "Epworth Sleepiness Scale", es: "Escala de Somnolencia de Epworth" },
  "reg.s1_ess_instructions": { en: "How likely are you to doze off or fall asleep in the following situations?<br><strong>0</strong> = Would never doze &nbsp; <strong>1</strong> = Slight chance &nbsp; <strong>2</strong> = Moderate chance &nbsp; <strong>3</strong> = High chance", es: "¿Qué tan probable es que se quede dormido o dormite en las siguientes situaciones?<br><strong>0</strong> = Nunca me dormiría &nbsp; <strong>1</strong> = Probabilidad leve &nbsp; <strong>2</strong> = Probabilidad moderada &nbsp; <strong>3</strong> = Probabilidad alta" },
  "reg.s1_ess_situation_th": { en: "Situation", es: "Situación" },
  "reg.s1_ess_row1": { en: "Sitting and reading", es: "Sentado leyendo" },
  "reg.s1_ess_row2": { en: "Watching TV", es: "Viendo televisión" },
  "reg.s1_ess_row3": { en: "Sitting inactive in a public place", es: "Sentado inactivo en un lugar público" },
  "reg.s1_ess_row4": { en: "As a passenger in a car for an hour", es: "Como pasajero en un auto durante una hora" },
  "reg.s1_ess_row5": { en: "Lying down in the afternoon when possible", es: "Recostado por la tarde cuando las circunstancias lo permiten" },
  "reg.s1_ess_row6": { en: "Sitting and talking to someone", es: "Sentado conversando con alguien" },
  "reg.s1_ess_row7": { en: "Sitting quietly after lunch (no alcohol)", es: "Sentado tranquilamente después del almuerzo (sin alcohol)" },
  "reg.s1_ess_row8": { en: "In a car stopped for a few minutes in traffic", es: "En un auto detenido unos minutos por el tráfico" },
  "reg.s1_medhx_ttl": { en: "Medical History", es: "Historial Médico" },
  "reg.s1_medhx_instructions": { en: "Check all conditions that apply to you:", es: "Marque todas las condiciones que le correspondan:" },
  "reg.s1_hx1": { en: "High Blood Pressure (Hypertension)", es: "Presión Arterial Alta (Hipertensión)" },
  "reg.s1_hx2": { en: "Diabetes (Type 1 or Type 2)", es: "Diabetes (Tipo 1 o Tipo 2)" },
  "reg.s1_hx3": { en: "Heart Disease / Cardiac Condition", es: "Enfermedad Cardíaca / Condición Cardíaca" },
  "reg.s1_hx4": { en: "Atrial Fibrillation (AFib)", es: "Fibrilación Auricular (AFib)" },
  "reg.s1_hx5": { en: "Stroke or TIA", es: "Derrame Cerebral o AIT" },
  "reg.s1_hx6": { en: "Asthma", es: "Asma" },
  "reg.s1_hx7": { en: "COPD / Emphysema", es: "EPOC / Enfisema" },
  "reg.s1_hx8": { en: "Anxiety / Panic Disorder", es: "Ansiedad / Trastorno de Pánico" },
  "reg.s1_hx9": { en: "Depression", es: "Depresión" },
  "reg.s1_hx10": { en: "Thyroid Disorder", es: "Trastorno de Tiroides" },
  "reg.s1_hx11": { en: "Obesity", es: "Obesidad" },
  "reg.s1_hx12": { en: "GERD / Acid Reflux", es: "ERGE / Reflujo Ácido" },
  "reg.s1_hx13": { en: "Cancer (current or past)", es: "Cáncer (actual o pasado)" },
  "reg.s1_hx14": { en: "Kidney Disease", es: "Enfermedad Renal" },
  "reg.s1_hx15": { en: "Liver Disease", es: "Enfermedad Hepática" },
  "reg.s1_hx_other_lbl": { en: "Other Medical Conditions", es: "Otras Condiciones Médicas" },
  "reg.s1_hx_other_ph": { en: "List any other conditions not listed above", es: "Enumere cualquier otra condición no mencionada arriba" },
  "reg.s1_meds_ttl": { en: "Medications &amp; Allergies", es: "Medicamentos y Alergias" },
  "reg.s1_meds_lbl": { en: "Current Medications (include dosages if known)", es: "Medicamentos Actuales (incluya dosis si las conoce)" },
  "reg.s1_meds_ph": { en: "List all current medications, vitamins, and supplements...", es: "Enumere todos los medicamentos, vitaminas y suplementos actuales..." },
  "reg.s1_allergies_lbl": { en: "Known Drug Allergies", es: "Alergias Conocidas a Medicamentos" },
  "reg.s1_allergies_ph": { en: "List any drug allergies or NKDA (No Known Drug Allergies)", es: "Enumere cualquier alergia a medicamentos o indique NKDA (Sin Alergias Conocidas)" },
  "reg.s1_additional_ttl": { en: "Additional Information", es: "Información Adicional" },
  "reg.s1_height_lbl": { en: "Height", es: "Estatura" },
  "reg.s1_weight_lbl": { en: "Weight", es: "Peso" },
  "reg.s1_comments_lbl": { en: "Additional Comments or Concerns", es: "Comentarios o Inquietudes Adicionales" },
  "reg.s1_comments_ph": { en: "Anything else you would like your provider to know...", es: "Cualquier otra cosa que desee que su proveedor sepa..." },
  "reg.s1_next_btn": { en: "Next: Patient Demographics &rarr;", es: "Siguiente: Datos Demográficos &rarr;" },

  // ── STEP 2: Patient Demographics ──
  "reg.req_note": { en: "<span>*</span> Indicates a required field", es: "<span>*</span> Indica un campo obligatorio" },
  "reg.status_incomplete": { en: "Incomplete", es: "Incompleto" },
  "reg.status_complete": { en: "Complete", es: "Completo" },
  "reg.status_optional": { en: "Optional", es: "Opcional" },
  "reg.s2_menu_details_ttl": { en: "Patient Details", es: "Datos del Paciente" },
  "reg.s2_menu_details_sub": { en: "Name, date of birth, contact info, address, employer", es: "Nombre, fecha de nacimiento, información de contacto, dirección, empleador" },
  "reg.s2_menu_ec_ttl": { en: "Emergency Contact", es: "Contacto de Emergencia" },
  "reg.s2_menu_ec_sub": { en: "Name, relationship, phone", es: "Nombre, relación, teléfono" },
  "reg.s2_menu_ins_ttl": { en: "Insurance Information", es: "Información del Seguro" },
  "reg.s2_menu_ins_sub": { en: "Primary &amp; secondary insurance, PCP, referring provider", es: "Seguro primario y secundario, médico de cabecera, proveedor que refiere" },
  "reg.s2_menu_pharm_ttl": { en: "Preferred Pharmacy", es: "Farmacia Preferida" },
  "reg.s2_menu_pharm_sub": { en: "Pharmacy name, address, phone", es: "Nombre, dirección y teléfono de la farmacia" },
  "reg.s2_first_name": { en: "First Name", es: "Nombre" },
  "reg.s2_last_name": { en: "Last Name", es: "Apellido" },
  "reg.s2_mi": { en: "Middle Initial", es: "Inicial del Segundo Nombre" },
  "reg.s2_dob": { en: "Date of Birth", es: "Fecha de Nacimiento" },
  "reg.s2_age": { en: "Age", es: "Edad" },
  "reg.s2_sex": { en: "Sex", es: "Sexo" },
  "reg.s2_male": { en: "Male", es: "Masculino" },
  "reg.s2_female": { en: "Female", es: "Femenino" },
  "reg.s2_dl": { en: "Driver's License/ID #", es: "Licencia de Conducir/# de Identificación" },
  "reg.s2_address": { en: "Street Address", es: "Dirección" },
  "reg.s2_city": { en: "City", es: "Ciudad" },
  "reg.s2_state": { en: "State", es: "Estado" },
  "reg.s2_state_select": { en: "-- Select state --", es: "-- Seleccione un estado --" },
  "reg.s2_zip": { en: "Zip Code", es: "Código Postal" },
  "reg.s2_home_phone": { en: "Home Phone", es: "Teléfono de Casa" },
  "reg.s2_cell_phone": { en: "Cell Phone", es: "Teléfono Celular" },
  "reg.s2_phone_note": { en: "At least one phone number is required.", es: "Se requiere al menos un número de teléfono." },
  "reg.s2_email": { en: "Email Address", es: "Correo Electrónico" },
  "reg.s2_marital": { en: "Marital Status", es: "Estado Civil" },
  "reg.s2_single": { en: "Single", es: "Soltero(a)" },
  "reg.s2_married": { en: "Married", es: "Casado(a)" },
  "reg.s2_divorced": { en: "Divorced", es: "Divorciado(a)" },
  "reg.s2_widowed": { en: "Widowed", es: "Viudo(a)" },
  "reg.s2_employer": { en: "Employer", es: "Empleador" },
  "reg.s2_employer_ph": { en: "Employer name", es: "Nombre del empleador" },
  "reg.s2_occupation": { en: "Occupation", es: "Ocupación" },
  "reg.s2_occupation_ph": { en: "Your occupation", es: "Su ocupación" },
  "reg.s2_ec1_ttl": { en: "Emergency Contact 1", es: "Contacto de Emergencia 1" },
  "reg.s2_ec2_ttl": { en: "Emergency Contact 2 (Optional)", es: "Contacto de Emergencia 2 (Opcional)" },
  "reg.s2_ec_name": { en: "Contact Name", es: "Nombre del Contacto" },
  "reg.s2_ec_rel": { en: "Relationship", es: "Relación" },
  "reg.s2_ec_phone": { en: "Contact Phone", es: "Teléfono del Contacto" },
  "reg.s2_ec_name_ph": { en: "Full name", es: "Nombre completo" },
  "reg.s2_ec_rel_ph": { en: "Spouse, Child, etc.", es: "Cónyuge, hijo(a), etc." },
  "reg.s2_ins1": { en: "Primary Insurance Company", es: "Compañía de Seguro Primario" },
  "reg.s2_ins_select": { en: "-- Select insurance --", es: "-- Seleccione un seguro --" },
  "reg.s2_ins_selfpay": { en: "Self-Pay / Uninsured", es: "Pago Directo / Sin Seguro" },
  "reg.s2_ins_other": { en: "Other", es: "Otro" },
  "reg.s2_ph_name": { en: "Policy Holder/Payee Name", es: "Nombre del Titular de la Póliza/Beneficiario" },
  "reg.s2_ph_name_ph": { en: "Policy holder full name", es: "Nombre completo del titular de la póliza" },
  "reg.s2_same_as_patient": { en: "Check if Name and Date of Birth is same as Patient", es: "Marque si el Nombre y la Fecha de Nacimiento son iguales a los del Paciente" },
  "reg.s2_ins_other_specify": { en: "Please specify your insurance", es: "Especifique su seguro" },
  "reg.s2_ins_other_ph": { en: "Insurance company name", es: "Nombre de la compañía de seguro" },
  "reg.s2_ph_dob": { en: "Policy Holder Date of Birth", es: "Fecha de Nacimiento del Titular de la Póliza" },
  "reg.s2_ph_rel": { en: "Relation to Patient", es: "Relación con el Paciente" },
  "reg.s2_ph_rel_ph": { en: "Self, Spouse, etc.", es: "Mismo paciente, cónyuge, etc." },
  "reg.s2_member_id": { en: "Member ID #", es: "# de Identificación de Miembro" },
  "reg.s2_member_id_ph": { en: "Member ID", es: "Identificación de miembro" },
  "reg.s2_group_num": { en: "Group #", es: "# de Grupo" },
  "reg.s2_group_num_ph": { en: "Group number", es: "Número de grupo" },
  "reg.s2_ins2": { en: "Secondary Insurance (if any)", es: "Seguro Secundario (si aplica)" },
  "reg.s2_ins2_ph": { en: "Secondary insurance", es: "Seguro secundario" },
  "reg.s2_member_id2": { en: "Secondary Member ID #", es: "# de Identificación del Seguro Secundario" },
  "reg.s2_member_id2_ph": { en: "Secondary member ID", es: "Identificación del seguro secundario" },
  "reg.s2_pcp": { en: "Primary Care Provider (PCP)", es: "Médico de Cabecera (PCP)" },
  "reg.s2_pcp_ph": { en: "PCP name", es: "Nombre del médico de cabecera" },
  "reg.s2_ref_prov": { en: "Referring Provider", es: "Proveedor que Refiere" },
  "reg.s2_ref_prov_ph": { en: "Referring provider name", es: "Nombre del proveedor que refiere" },
  "reg.s2_selfpay_pop": { en: "Self-Pay/Uninsured selected, no further details needed", es: "Pago Directo/Sin Seguro seleccionado, no se necesitan más detalles" },
  "reg.s2_pharm_name": { en: "Pharmacy Name", es: "Nombre de la Farmacia" },
  "reg.s2_pharm_name_ph": { en: "Pharmacy name", es: "Nombre de la farmacia" },
  "reg.s2_pharm_addr": { en: "Pharmacy Address", es: "Dirección de la Farmacia" },
  "reg.s2_pharm_addr_ph": { en: "Pharmacy address", es: "Dirección de la farmacia" },
  "reg.s2_pharm_phone": { en: "Pharmacy Phone", es: "Teléfono de la Farmacia" },
  "reg.next_btn": { en: "Next", es: "Siguiente" },
  "reg.s2_next_btn": { en: "Next: Consent to Treat &rarr;", es: "Siguiente: Consentimiento para Tratamiento &rarr;" },

  // ── STEP 3: Consents & Signatures (legal text -- see feedback memory:
  // vetted by the practice, translated in full at their explicit direction) ──
  "reg.s3_sub": { en: "Please review and sign each of the following consents.", es: "Por favor revise y firme cada uno de los siguientes consentimientos." },
  "reg.s3_menu_treat_ttl": { en: "Consent to Treat", es: "Consentimiento para Tratamiento" },
  "reg.s3_menu_treat_sub": { en: "Consent to treatment, evaluation, and diagnosis", es: "Consentimiento para tratamiento, evaluación y diagnóstico" },
  "reg.s3_menu_financial_ttl": { en: "Financial Policy", es: "Política Financiera" },
  "reg.s3_menu_financial_sub": { en: "Co-pays, billing, and cancellation policy", es: "Copagos, facturación y política de cancelación" },
  "reg.s3_menu_hipaa_ttl": { en: "HIPAA Notice of Privacy Practices", es: "Aviso de Prácticas de Privacidad de HIPAA" },
  "reg.s3_menu_hipaa_sub": { en: "Acknowledge our Notice of Privacy Practices", es: "Reconocer nuestro Aviso de Prácticas de Privacidad" },
  "reg.s3_menu_texttele_ttl": { en: "Text &amp; Telehealth Consent", es: "Consentimiento de Mensajes de Texto y Telesalud" },
  "reg.s3_menu_texttele_sub": { en: "Optional — text message and telehealth consent", es: "Opcional — consentimiento de mensajes de texto y telesalud" },

  "reg.s3_treat_h4": { en: "Consent to Treatment", es: "Consentimiento para Tratamiento" },
  "reg.s3_treat_p1": { en: "I hereby consent to and authorize West Coast Sleep Clinic and its physicians, nurses, and medical staff to provide medical evaluation, diagnosis, and treatment that they deem appropriate for my care. I understand that the practice of medicine is not an exact science, and that no guarantees or assurances have been made regarding the outcome of any treatment or procedure.", es: "Por medio del presente, doy mi consentimiento y autorizo a West Coast Sleep Clinic y a sus médicos, enfermeros y personal médico a brindar la evaluación médica, el diagnóstico y el tratamiento que consideren apropiados para mi cuidado. Entiendo que la práctica de la medicina no es una ciencia exacta, y que no se ha hecho ninguna garantía ni promesa respecto al resultado de ningún tratamiento o procedimiento." },
  "reg.s3_treat_p2": { en: "I consent to physical examinations, diagnostic tests (including blood draws, sleep studies, imaging, and other procedures), medical treatments, and the administration of medications as deemed necessary by the treating physician.", es: "Doy mi consentimiento para exámenes físicos, pruebas diagnósticas (incluyendo extracciones de sangre, estudios del sueño, estudios de imagen y otros procedimientos), tratamientos médicos y la administración de medicamentos que el médico tratante considere necesarios." },
  "reg.s3_treat_p3": { en: "I understand that I may refuse any treatment or procedure at any time, and that I have the right to ask questions about any recommended treatment before consenting to it. I have the right to be informed about my diagnosis, the nature and purpose of any proposed treatment, the risks and benefits, and any alternative treatments available.", es: "Entiendo que puedo rechazar cualquier tratamiento o procedimiento en cualquier momento, y que tengo derecho a hacer preguntas sobre cualquier tratamiento recomendado antes de dar mi consentimiento. Tengo derecho a ser informado(a) sobre mi diagnóstico, la naturaleza y el propósito de cualquier tratamiento propuesto, los riesgos y beneficios, y cualquier tratamiento alternativo disponible." },
  "reg.s3_treat_p4": { en: "I acknowledge that I have received and reviewed the Notice of Privacy Practices describing how my protected health information may be used and disclosed. I authorize West Coast Sleep Clinic to use my health information as described in that notice.", es: "Reconozco que he recibido y revisado el Aviso de Prácticas de Privacidad que describe cómo se puede usar y divulgar mi información médica protegida. Autorizo a West Coast Sleep Clinic a usar mi información médica según lo descrito en dicho aviso." },
  "reg.s3_treat_p5": { en: "I authorize West Coast Sleep Clinic to bill my insurance company or other third-party payer on my behalf for services rendered. I understand that I am ultimately responsible for any charges not covered by my insurance.", es: "Autorizo a West Coast Sleep Clinic a facturar a mi compañía de seguros u otro pagador externo en mi nombre por los servicios prestados. Entiendo que, en última instancia, soy responsable de cualquier cargo no cubierto por mi seguro." },
  "reg.s3_treat_checkbox": { en: "I have read and understand the Consent to Treatment above, and I consent to the treatment and authorization described.", es: "He leído y entiendo el Consentimiento para Tratamiento anterior, y doy mi consentimiento para el tratamiento y la autorización descritos." },
  "reg.s3_patient_sig": { en: "Patient (or Guardian) Signature", es: "Firma del Paciente (o Tutor)" },
  "reg.s3_date": { en: "Date", es: "Fecha" },
  "reg.s3_clear_sig": { en: "Clear Signature", es: "Borrar Firma" },
  "reg.s3_treat_next_btn": { en: "Next: Financial Policy &rarr;", es: "Siguiente: Política Financiera &rarr;" },

  "reg.s3_financial_h4": { en: "Patient Financial Policy", es: "Política Financiera del Paciente" },
  "reg.s3_fin_p1": { en: "<strong>Co-pays, Deductibles &amp; Co-insurance:</strong> All co-pays, deductibles, and co-insurance amounts are due at the time of service. We accept cash, check, and major credit/debit cards.", es: "<strong>Copagos, Deducibles y Coseguro:</strong> Todos los copagos, deducibles y montos de coseguro deben pagarse en el momento del servicio. Aceptamos efectivo, cheque y las principales tarjetas de crédito/débito." },
  "reg.s3_fin_p2": { en: "<strong>Insurance Billing:</strong> We will bill your insurance company as a courtesy. You are responsible for ensuring that we have current and accurate insurance information. If your insurance does not pay within 60 days, the balance will become your responsibility.", es: "<strong>Facturación al Seguro:</strong> Facturaremos a su compañía de seguros como cortesía. Usted es responsable de asegurarse de que tengamos información de seguro actual y precisa. Si su seguro no paga dentro de 60 días, el saldo pasará a ser su responsabilidad." },
  "reg.s3_fin_p3": { en: "<strong>Non-Covered Services:</strong> Some services may not be covered by your insurance plan. You will be financially responsible for these services.", es: "<strong>Servicios No Cubiertos:</strong> Es posible que algunos servicios no estén cubiertos por su plan de seguro. Usted será financieramente responsable de estos servicios." },
  "reg.s3_fin_p4": { en: "<strong>Referrals &amp; Prior Authorizations:</strong> If your insurance requires a referral or prior authorization, it is your responsibility to obtain this before your visit. Failure to do so may result in non-payment by your insurance, and you will be responsible for the full balance.", es: "<strong>Referencias y Autorizaciones Previas:</strong> Si su seguro requiere una referencia o autorización previa, es su responsabilidad obtenerla antes de su visita. No hacerlo puede resultar en la falta de pago por parte de su seguro, y usted será responsable del saldo total." },
  "reg.s3_fin_p5": { en: "<strong>Self-Pay Patients:</strong> Payment is due in full at the time of service. Please contact our billing office to discuss payment arrangements if needed.", es: "<strong>Pacientes de Pago Directo:</strong> El pago se debe realizar en su totalidad en el momento del servicio. Comuníquese con nuestra oficina de facturación para hablar sobre arreglos de pago si es necesario." },
  "reg.s3_fin_p6": { en: "<strong>Returned Checks:</strong> A fee of $35.00 will be charged for any returned checks.", es: "<strong>Cheques Devueltos:</strong> Se cobrará una tarifa de $35.00 por cualquier cheque devuelto." },
  "reg.s3_fin_p7": { en: "<strong>Cancellations:</strong> We require 24 hours notice for appointment cancellations. Repeated late cancellations or no-shows may result in a fee.", es: "<strong>Cancelaciones:</strong> Requerimos un aviso de 24 horas para cancelar citas. Las cancelaciones tardías repetidas o la inasistencia pueden resultar en un cargo." },
  "reg.s3_fin_checkbox": { en: "I have read and understand the Financial Policy above, and I agree to abide by its terms.", es: "He leído y entiendo la Política Financiera anterior, y acepto cumplir con sus términos." },
  "reg.s3_fin_next_btn": { en: "Next: HIPAA Notice &rarr;", es: "Siguiente: Aviso de HIPAA &rarr;" },

  "reg.s3_hipaa_h4": { en: "Notice of Privacy Practices — Acknowledgment", es: "Aviso de Prácticas de Privacidad — Reconocimiento" },
  "reg.s3_hipaa_p1": { en: "This notice describes how medical information about you may be used and disclosed and how you can get access to this information. Please review it carefully.", es: "Este aviso describe cómo se puede usar y divulgar la información médica sobre usted, y cómo puede obtener acceso a esta información. Por favor revíselo cuidadosamente." },
  "reg.s3_hipaa_p2": { en: "<strong>Our Commitment to Your Privacy:</strong> West Coast Sleep Clinic is dedicated to maintaining the privacy of your protected health information (PHI). We are required by law to maintain the privacy of your PHI and to provide you with this notice regarding our legal duties and privacy practices.", es: "<strong>Nuestro Compromiso con Su Privacidad:</strong> West Coast Sleep Clinic se dedica a mantener la privacidad de su información médica protegida (PHI, por sus siglas en inglés). La ley nos exige mantener la privacidad de su PHI y proporcionarle este aviso sobre nuestros deberes legales y prácticas de privacidad." },
  "reg.s3_hipaa_p3": { en: "<strong>How We May Use Your Information:</strong> We may use or disclose your PHI for treatment purposes (such as sharing information with other providers involved in your care), payment purposes (such as billing your insurance company), and healthcare operations (such as quality assessment and improvement activities).", es: "<strong>Cómo Podemos Usar Su Información:</strong> Podemos usar o divulgar su PHI con fines de tratamiento (como compartir información con otros proveedores involucrados en su cuidado), con fines de pago (como facturar a su compañía de seguros) y para operaciones de atención médica (como actividades de evaluación y mejora de la calidad)." },
  "reg.s3_hipaa_p4": { en: "<strong>Your Rights:</strong> You have the right to:<ul><li>Request a restriction on uses and disclosures of your PHI</li><li>Request confidential communications</li><li>Inspect and copy your PHI</li><li>Request an amendment to your PHI</li><li>Receive an accounting of disclosures</li><li>Receive a copy of this notice</li></ul>", es: "<strong>Sus Derechos:</strong> Usted tiene derecho a:<ul><li>Solicitar una restricción sobre los usos y divulgaciones de su PHI</li><li>Solicitar comunicaciones confidenciales</li><li>Inspeccionar y obtener copias de su PHI</li><li>Solicitar una enmienda a su PHI</li><li>Recibir un informe de las divulgaciones realizadas</li><li>Recibir una copia de este aviso</li></ul>" },
  "reg.s3_hipaa_p5": { en: "<strong>Complaints:</strong> If you believe your privacy rights have been violated, you may file a complaint with our Privacy Officer or with the U.S. Department of Health and Human Services. We will not retaliate against you for filing a complaint.", es: "<strong>Quejas:</strong> Si usted cree que se han violado sus derechos de privacidad, puede presentar una queja ante nuestro Oficial de Privacidad o ante el Departamento de Salud y Servicios Humanos de EE. UU. No tomaremos represalias en su contra por presentar una queja." },
  "reg.s3_hipaa_checkbox": { en: "I acknowledge that I have received and reviewed the Notice of Privacy Practices for West Coast Sleep Clinic.", es: "Reconozco que he recibido y revisado el Aviso de Prácticas de Privacidad de West Coast Sleep Clinic." },
  "reg.s3_hipaa_rep_lbl": { en: "If you are signing on behalf of the patient, please explain your relationship:", es: "Si está firmando en nombre del paciente, explique su relación:" },
  "reg.s3_hipaa_rep_ph": { en: "Leave blank if signing for yourself", es: "Deje en blanco si firma por sí mismo(a)" },
  "reg.s3_hipaa_sig_lbl": { en: "Patient (or Representative) Signature", es: "Firma del Paciente (o Representante)" },
  "reg.s3_hipaa_next_btn": { en: "Next: Text &amp; Telehealth &rarr;", es: "Siguiente: Mensajes de Texto y Telesalud &rarr;" },

  "reg.s3_text_sec_ttl": { en: "Text Message Consent", es: "Consentimiento de Mensajes de Texto" },
  "reg.s3_text_h4": { en: "Consent to Receive Text Messages", es: "Consentimiento para Recibir Mensajes de Texto" },
  "reg.s3_text_p1": { en: "By signing below, you consent to receive text messages (SMS) from West Coast Sleep Clinic at the mobile phone number(s) you have provided. These messages may include appointment reminders, health information, billing notifications, and other practice communications.", es: "Al firmar a continuación, usted da su consentimiento para recibir mensajes de texto (SMS) de West Coast Sleep Clinic al número(s) de teléfono móvil que ha proporcionado. Estos mensajes pueden incluir recordatorios de citas, información de salud, notificaciones de facturación y otras comunicaciones de la práctica." },
  "reg.s3_text_p2": { en: "<strong>Message and data rates may apply.</strong> Message frequency varies. You may opt out at any time by replying STOP to any text message. Reply HELP for help. Carriers are not liable for delayed or undelivered messages.", es: "<strong>Pueden aplicar tarifas de mensajes y datos.</strong> La frecuencia de los mensajes varía. Puede optar por no participar en cualquier momento respondiendo STOP a cualquier mensaje de texto. Responda HELP para obtener ayuda. Los operadores de telefonía no son responsables por mensajes retrasados o no entregados." },
  "reg.s3_text_p3": { en: "Text messaging is not a secure form of communication. By consenting, you understand and accept the risk that text messages may be intercepted. Do not send sensitive medical information via text message.", es: "Los mensajes de texto no son una forma segura de comunicación. Al dar su consentimiento, usted entiende y acepta el riesgo de que los mensajes de texto puedan ser interceptados. No envíe información médica confidencial por mensaje de texto." },
  "reg.s3_text_checkbox": { en: "I consent to receive text messages from West Coast Sleep Clinic as described above.", es: "Doy mi consentimiento para recibir mensajes de texto de West Coast Sleep Clinic según lo descrito anteriormente." },
  "reg.s3_text_phone_lbl": { en: "Best Cell Phone for Texts", es: "Mejor Número de Celular para Mensajes de Texto" },
  "reg.s3_tele_sec_ttl": { en: "Telehealth Consent", es: "Consentimiento de Telesalud" },
  "reg.s3_tele_h4": { en: "Consent to Telehealth Services", es: "Consentimiento para Servicios de Telesalud" },
  "reg.s3_tele_p1": { en: "Telehealth involves the use of electronic communications to enable healthcare providers to provide clinical services to patients using interactive audio, video, or data communications. I understand that telehealth services involve the communication of my personal medical information, both orally and visually, to healthcare practitioners located in other areas.", es: "La telesalud implica el uso de comunicaciones electrónicas para que los proveedores de atención médica puedan brindar servicios clínicos a los pacientes mediante comunicaciones interactivas de audio, video o datos. Entiendo que los servicios de telesalud implican la comunicación de mi información médica personal, tanto oral como visualmente, a profesionales de la salud ubicados en otras áreas." },
  "reg.s3_tele_p2": { en: "<strong>Risks &amp; Benefits:</strong> I understand there are potential risks with telehealth including interruptions, unauthorized access, and technical difficulties. I understand that my healthcare provider may determine that the transmitted information is of insufficient quality to make medical or health decisions, and that I may need an in-person visit.", es: "<strong>Riesgos y Beneficios:</strong> Entiendo que existen riesgos potenciales con la telesalud, incluyendo interrupciones, acceso no autorizado y dificultades técnicas. Entiendo que mi proveedor de atención médica puede determinar que la información transmitida es de calidad insuficiente para tomar decisiones médicas o de salud, y que podría necesitar una visita en persona." },
  "reg.s3_tele_p3": { en: "<strong>Confidentiality:</strong> I understand that the laws that protect the privacy and security of my health information apply to telehealth services. West Coast Sleep Clinic will take steps to ensure my information is secure.", es: "<strong>Confidencialidad:</strong> Entiendo que las leyes que protegen la privacidad y seguridad de mi información de salud se aplican a los servicios de telesalud. West Coast Sleep Clinic tomará medidas para garantizar que mi información esté segura." },
  "reg.s3_tele_p4": { en: "I understand I may refuse telehealth services at any time without affecting my right to future care or treatment.", es: "Entiendo que puedo rechazar los servicios de telesalud en cualquier momento sin que esto afecte mi derecho a recibir atención o tratamiento en el futuro." },
  "reg.s3_tele_checkbox": { en: "I consent to telehealth services as described above and understand the risks and benefits associated with receiving care via telehealth.", es: "Doy mi consentimiento para los servicios de telesalud según lo descrito anteriormente y entiendo los riesgos y beneficios asociados con recibir atención a través de la telesalud." },
  "reg.s3_done_btn": { en: "Done", es: "Listo" },
  "reg.s3_next_btn": { en: "Next: Medical Record Request &rarr;", es: "Siguiente: Solicitud de Registros Médicos &rarr;" },

  // ── STEP 4: Authorization to Release ──
  "reg.s4_ttl": { en: "Authorization to Request Medical Records", es: "Autorización para Solicitar Registros Médicos" },
  "reg.s4_sub": { en: "Complete this form to authorize an outside provider to release your prior medical records to West Coast Sleep Clinic.", es: "Complete este formulario para autorizar a un proveedor externo a divulgar sus registros médicos anteriores a West Coast Sleep Clinic." },
  "reg.s4_provider_ttl": { en: "Your Healthcare Provider to Release Records to West Coast Sleep Clinic", es: "Su Proveedor de Salud que Divulgará los Registros a West Coast Sleep Clinic" },
  "reg.s4_facility": { en: "Facility/Provider", es: "Centro/Proveedor" },
  "reg.s4_address": { en: "Address", es: "Dirección" },
  "reg.s4_phone": { en: "Phone", es: "Teléfono" },
  "reg.s4_fax": { en: "Fax", es: "Fax" },
  "reg.s4_records_ttl": { en: "Select type of Records West Coast Sleep Clinic can request from your provider", es: "Seleccione el tipo de Registros que West Coast Sleep Clinic puede solicitar a su proveedor" },
  "reg.s4_rec_complete": { en: "Complete Medical Record", es: "Registro Médico Completo" },
  "reg.s4_rec_office_visit": { en: "Office Visit Notes", es: "Notas de Consulta" },
  "reg.s4_rec_sleep_study": { en: "Sleep Study Reports", es: "Informes de Estudios del Sueño" },
  "reg.s4_rec_consultation": { en: "Consultation Notes", es: "Notas de Consulta con Especialista" },
  "reg.s4_rec_medication_list": { en: "Medication List", es: "Lista de Medicamentos" },
  "reg.s4_rec_labs": { en: "Labs", es: "Laboratorios" },
  "reg.s4_rec_imaging": { en: "Imaging", es: "Estudios de Imagen" },
  "reg.s4_other": { en: "Other", es: "Otro" },
  "reg.s4_specify": { en: "Please specify", es: "Especifique" },
  "reg.s4_purpose_ttl": { en: "Purpose", es: "Propósito" },
  "reg.s4_purpose_continuity": { en: "Continuity of Care", es: "Continuidad de Atención" },
  "reg.s4_purpose_treatment": { en: "Treatment", es: "Tratamiento" },
  "reg.s4_purpose_patient_request": { en: "Patient Request", es: "Solicitud del Paciente" },
  "reg.s4_daterange_ttl": { en: "Date Range", es: "Rango de Fechas" },
  "reg.s4_all_records": { en: "All Records", es: "Todos los Registros" },
  "reg.s4_from": { en: "From", es: "Desde" },
  "reg.s4_to": { en: "To", es: "Hasta" },
  "reg.s4_auth_h4": { en: "Authorization", es: "Autorización" },
  "reg.s4_auth_p": { en: "I authorize the healthcare provider listed above to release my protected health information to West Coast Sleep Clinic. I understand this authorization may be revoked in writing at any time except where action has already been taken. This authorization expires one year from the date signed unless otherwise specified.", es: "Autorizo al proveedor de salud indicado arriba a divulgar mi información médica protegida a West Coast Sleep Clinic. Entiendo que esta autorización puede ser revocada por escrito en cualquier momento, excepto en los casos en que ya se haya tomado alguna acción. Esta autorización vence un año después de la fecha de firma, a menos que se especifique lo contrario." },
  "reg.s4_checkbox": { en: "I authorize the release of the medical information described above.", es: "Autorizo la divulgación de la información médica descrita anteriormente." },
  "reg.s4_relationship": { en: "Relationship (if applicable)", es: "Relación (si aplica)" },
  "reg.s4_patient_sig": { en: "Patient/Legal Representative Signature", es: "Firma del Paciente/Representante Legal" },
  "reg.s4_next_btn": { en: "Next: Schedule Appointment &rarr;", es: "Siguiente: Programar Cita &rarr;" },

  // ── STEP 5: Schedule Appointment ──
  "reg.s5_sub": { en: "Pick a time that works for you. Availability reflects the doctor's real schedule.", es: "Elija un horario que le convenga. La disponibilidad refleja el horario real del médico." },
  "reg.s5_loading": { en: "Loading available appointment times&hellip;", es: "Cargando horarios de citas disponibles&hellip;" },
  "reg.s5_fallback": { en: "We're unable to show real-time availability right now. Our office will call you to confirm your appointment time.", es: "En este momento no podemos mostrar la disponibilidad en tiempo real. Nuestra oficina la llamará para confirmar el horario de su cita." },
  "reg.s5_swipe_instructions": { en: "Swipe up or down to browse available times, then tap one to select it.", es: "Deslice hacia arriba o abajo para ver los horarios disponibles, y toque uno para seleccionarlo." },
  "reg.s6_next_btn": { en: "Next: Review &amp; Submit &rarr;", es: "Siguiente: Revisar y Enviar &rarr;" },

  // ── STEP 6: Review & Submit ──
  "reg.s6_sub": { en: "Please review your information below before submitting. Click Edit on any section to make changes.", es: "Revise su información a continuación antes de enviarla. Haga clic en Editar en cualquier sección para hacer cambios." },
  "reg.s6_edit_btn": { en: "Edit", es: "Editar" },
  "reg.s6_card_demographics": { en: "Patient Demographics", es: "Datos Demográficos del Paciente" },
  "reg.s6_card_reason": { en: "Reason for Appointment", es: "Motivo de la Cita" },
  "reg.s6_card_consents": { en: "Consents &amp; Signatures", es: "Consentimientos y Firmas" },
  "reg.s6_card_release": { en: "Authorization to Release", es: "Autorización de Divulgación" },
  "reg.s6_card_scheduled": { en: "Scheduled Appointment", es: "Cita Programada" },
  "reg.s6_upload_ttl": { en: "Upload Documents (optional)", es: "Subir Documentos (opcional)" },
  "reg.s6_upload_note": { en: "If you have insurance cards, referral paperwork, or prior sleep study results, you may upload them here.", es: "Si tiene tarjetas de seguro, documentos de referencia o resultados de estudios del sueño anteriores, puede subirlos aquí." },
  "reg.submit_btn": { en: "Submit Registration ✓", es: "Enviar Registro ✓" },

  // ── Done page ──
  "reg.done_heading": { en: "Registration Complete!", es: "¡Registro Completo!" },
  "reg.done_p1": { en: "Thank you for completing your patient registration. Our team at West Coast Sleep Clinic has received your forms.", es: "Gracias por completar su registro de paciente. Nuestro equipo en West Coast Sleep Clinic ha recibido sus formularios." },
  "reg.done_p2": { en: 'We will contact you shortly to confirm your appointment. If you have any questions, please call or text us at <strong>727-472-9112</strong>.', es: 'Nos comunicaremos con usted en breve para confirmar su cita. Si tiene alguna pregunta, llámenos o envíenos un mensaje de texto al <strong>727-472-9112</strong>.' },
  "reg.done_p3": { en: "Sleep Better. Feel Better. Live Better.", es: "Duerma Mejor. Siéntase Mejor. Viva Mejor." },
  "reg.already_registered_heading": { en: "Registration Already on File", es: "Registro Ya Existente" },
  "reg.already_registered_p": { en: 'It looks like a registration was already submitted under this name and date of birth. Please call our office at <strong>727-472-9112</strong> so our team can look into this for you.', es: 'Parece que ya se envió un registro con este nombre y fecha de nacimiento. Llame a nuestra oficina al <strong>727-472-9112</strong> para que nuestro equipo pueda ayudarle.' },
  "reg.return_home": { en: "Return to Home", es: "Volver al Inicio" },

  // Dynamic strings set from JS (via t()) -- status badges, submit/upload
  // button states, and rvRow() review-card labels
  "reg.submitting": { en: "Submitting…", es: "Enviando…" },
  "reg.submit_error_prefix": { en: "Unable to submit. Please call us at 727-472-9112 or try again. (", es: "No se pudo enviar. Llámenos al 727-472-9112 o intente de nuevo. (" },
  "reg.rv_name": { en: "Name", es: "Nombre" },
  "reg.rv_dob": { en: "Date of Birth", es: "Fecha de Nacimiento" },
  "reg.rv_age": { en: "Age", es: "Edad" },
  "reg.rv_sex": { en: "Sex", es: "Sexo" },
  "reg.rv_dl": { en: "Driver's License/ID #", es: "Licencia de Conducir/# de Identificación" },
  "reg.rv_address": { en: "Address", es: "Dirección" },
  "reg.rv_home_phone": { en: "Home Phone", es: "Teléfono de Casa" },
  "reg.rv_cell_phone": { en: "Cell Phone", es: "Teléfono Celular" },
  "reg.rv_email": { en: "Email", es: "Correo Electrónico" },
  "reg.rv_marital": { en: "Marital Status", es: "Estado Civil" },
  "reg.rv_employer": { en: "Employer", es: "Empleador" },
  "reg.rv_occupation": { en: "Occupation", es: "Ocupación" },
  "reg.rv_ec_name": { en: "Emergency Contact", es: "Contacto de Emergencia" },
  "reg.rv_ec_rel": { en: "EC Relationship", es: "Relación del Contacto de Emergencia" },
  "reg.rv_ec_phone": { en: "EC Phone", es: "Teléfono del Contacto de Emergencia" },
  "reg.rv_ec2_name": { en: "Emergency Contact 2", es: "Contacto de Emergencia 2" },
  "reg.rv_ec2_rel": { en: "EC2 Relationship", es: "Relación del Contacto de Emergencia 2" },
  "reg.rv_ec2_phone": { en: "EC2 Phone", es: "Teléfono del Contacto de Emergencia 2" },
  "reg.rv_primary_ins": { en: "Primary Insurance", es: "Seguro Primario" },
  "reg.rv_policy_holder": { en: "Policy Holder", es: "Titular de la Póliza" },
  "reg.rv_policy_holder_dob": { en: "Policy Holder DOB", es: "Fecha de Nacimiento del Titular" },
  "reg.rv_member_id": { en: "Member ID", es: "Identificación de Miembro" },
  "reg.rv_group_num": { en: "Group #", es: "# de Grupo" },
  "reg.rv_secondary_ins": { en: "Secondary Insurance", es: "Seguro Secundario" },
  "reg.rv_secondary_member_id": { en: "Secondary Member ID", es: "Identificación del Seguro Secundario" },
  "reg.rv_pcp": { en: "PCP", es: "Médico de Cabecera" },
  "reg.rv_ref_prov": { en: "Referring Provider", es: "Proveedor que Refiere" },
  "reg.rv_pharm_name": { en: "Pharmacy Name", es: "Nombre de la Farmacia" },
  "reg.rv_pharm_addr": { en: "Pharmacy Address", es: "Dirección de la Farmacia" },
  "reg.rv_pharm_phone": { en: "Pharmacy Phone", es: "Teléfono de la Farmacia" }
};

function i18nGet(key, lang) {
  var entry = I18N_DICT[key];
  if (!entry) return key;
  return entry[lang] || entry.en || key;
}

// Exposed for dynamic (JS-generated) strings that aren't in the markup at
// load time -- e.g. a button's "Uploading…" state or an error message.
function t(key) {
  return i18nGet(key, getLang());
}

function getLang() {
  return localStorage.getItem('wcsc_lang') || 'en';
}

function i18nApply(lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(function (el) {
    el.innerHTML = i18nGet(el.getAttribute('data-i18n'), lang);
  });
  document.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
    el.setAttribute('alt', i18nGet(el.getAttribute('data-i18n-alt'), lang));
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
    el.setAttribute('aria-label', i18nGet(el.getAttribute('data-i18n-aria'), lang));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
    el.setAttribute('placeholder', i18nGet(el.getAttribute('data-i18n-placeholder'), lang));
  });
  document.querySelectorAll('[data-lang-opt]').forEach(function (el) {
    el.classList.toggle('active', el.getAttribute('data-lang-opt') === lang);
  });
}

function setLang(lang) {
  localStorage.setItem('wcsc_lang', lang);
  i18nApply(lang);
  // Lets pages with their own dynamically-rendered text (e.g. registration.html's
  // form-status badges, which are fully JS-owned and intentionally NOT tagged
  // with data-i18n) re-render themselves in the new language too.
  document.dispatchEvent(new CustomEvent('i18nchange', { detail: { lang: lang } }));
}

function toggleLang() {
  setLang(getLang() === 'es' ? 'en' : 'es');
}

function i18nInit() {
  i18nApply(getLang());
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', i18nInit);
} else {
  i18nInit();
}
