document.addEventListener("DOMContentLoaded", () => {
    // Declare particlesJS, Typed, and AOS
    let particlesJS, AOS
  
    // Particles.js initialization
    if (typeof particlesJS !== "undefined") {
      particlesJS("particles-js", {
        particles: {
          number: {
            value: 100,
            density: {
              enable: true,
              value_area: 800,
            },
          },
          color: {
            value: "#00d9ff",
          },
          shape: {
            type: "circle",
            stroke: {
              width: 0,
              color: "#000000",
            },
            polygon: {
              nb_sides: 5,
            },
          },
          opacity: {
            value: 0.3,
            random: true,
            anim: {
              enable: true,
              speed: 1,
              opacity_min: 0.1,
              sync: false,
            },
          },
          size: {
            value: 3,
            random: true,
            anim: {
              enable: true,
              speed: 2,
              size_min: 0.1,
              sync: false,
            },
          },
          line_linked: {
            enable: true,
            distance: 150,
            color: "#00d9ff",
            opacity: 0.2,
            width: 1,
          },
          move: {
            enable: true,
            speed: 1,
            direction: "none",
            random: true,
            straight: false,
            out_mode: "out",
            bounce: false,
            attract: {
              enable: true,
              rotateX: 600,
              rotateY: 1200,
            },
          },
        },
        interactivity: {
          detect_on: "canvas",
          events: {
            onhover: {
              enable: true,
              mode: "grab",
            },
            onclick: {
              enable: true,
              mode: "push",
            },
            resize: true,
          },
          modes: {
            grab: {
              distance: 140,
              line_linked: {
                opacity: 1,
              },
            },
            bubble: {
              distance: 400,
              size: 40,
              duration: 2,
              opacity: 8,
              speed: 3,
            },
            repulse: {
              distance: 200,
              duration: 0.4,
            },
            push: {
              particles_nb: 4,
            },
            remove: {
              particles_nb: 2,
            },
          },
        },
        retina_detect: true,
      })
    }
  
    // Typed.js initialization
    if (typeof Typed !== "undefined") {
      const typed = new Typed(".typing", {
        strings: [
          "Computer Science Student at Georgia Tech",
          "Software Developer",
          "TikTok Effect Creator",
          "Project Manager",
          "Teaching Assistant",
        ],
        typeSpeed: 50,
        backSpeed: 30,
        backDelay: 1500,
        startDelay: 1000,
        loop: true,
      })
    }
  
    // Initialize AOS (Animate On Scroll)
    if (typeof AOS !== "undefined") {
      AOS.init({
        duration: 1000,
        easing: "ease-in-out",
        once: true,
        mirror: false,
      })
    }
  
    // Custom cursor
    const cursorDot = document.getElementById("cursor-dot")
    const cursorOutline = document.getElementById("cursor-outline")
  
    window.addEventListener("mousemove", (e) => {
      const posX = e.clientX
      const posY = e.clientY
  
      cursorDot.style.left = `${posX}px`
      cursorDot.style.top = `${posY}px`
  
      cursorOutline.animate(
        {
          left: `${posX}px`,
          top: `${posY}px`,
        },
        { duration: 500, fill: "forwards" },
      )
    })
  
    // Navbar scroll effect
    const navbar = document.getElementById("mainNav")
    window.addEventListener("scroll", () => {
      if (window.scrollY > 50) {
        navbar.classList.add("scrolled")
      } else {
        navbar.classList.remove("scrolled")
      }
    })
  
    // Back to top button
    const backToTopButton = document.getElementById("back-to-top")
    window.addEventListener("scroll", () => {
      if (window.scrollY > 300) {
        backToTopButton.classList.add("active")
      } else {
        backToTopButton.classList.remove("active")
      }
    })
  
    backToTopButton.addEventListener("click", (e) => {
      e.preventDefault()
      window.scrollTo({ top: 0, behavior: "smooth" })
    })
  
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        e.preventDefault()
  
        const targetId = this.getAttribute("href")
        if (targetId === "#") return
  
        const targetElement = document.querySelector(targetId)
        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: "smooth",
          })
        }
  
        // Close mobile menu if open
        const navbarCollapse = document.getElementById("navbarNav")
        if (navbarCollapse.classList.contains("show")) {
          document.querySelector(".navbar-toggler").click()
        }
      })
    })
  
    // Project filtering
    const filterButtons = document.querySelectorAll(".filter-btn")
    const projectItems = document.querySelectorAll(".project-item")
  
    filterButtons.forEach((button) => {
      button.addEventListener("click", function () {
        // Remove active class from all buttons
        filterButtons.forEach((btn) => btn.classList.remove("active"))
        // Add active class to clicked button
        this.classList.add("active")
  
        const filterValue = this.getAttribute("data-filter")
  
        projectItems.forEach((item) => {
          if (filterValue === "all" || item.classList.contains(filterValue)) {
            item.style.display = "block"
            setTimeout(() => {
              item.style.opacity = "1"
              item.style.transform = "scale(1) translateY(0)"
            }, 100)
          } else {
            item.style.opacity = "0"
            item.style.transform = "scale(0.8) translateY(20px)"
            setTimeout(() => {
              item.style.display = "none"
            }, 300)
          }
        })
      })
    })
  
    // Animate progress bars on scroll
    const skillItems = document.querySelectorAll(".skill-item")
  
    const animateProgressBars = () => {
      skillItems.forEach((item) => {
        const progressBar = item.querySelector(".progress-bar")
        const percentage = item.getAttribute("data-percentage")
  
        const rect = item.getBoundingClientRect()
        const isVisible = rect.top < window.innerHeight && rect.bottom >= 0
  
        if (isVisible) {
          progressBar.style.width = `${percentage}%`
        }
      })
    }
  
    window.addEventListener("scroll", animateProgressBars)
    animateProgressBars() // Initial check
  
    // Set current year in footer
    document.getElementById("current-year").textContent = new Date().getFullYear()
  
    // Add random animation delay to tech items
    document.querySelectorAll(".tech-item").forEach((item, index) => {
      item.style.setProperty("--i", index)
    })
  
    // Add 3D tilt effect to project cards
    const projectCards = document.querySelectorAll(".project-card")
  
    projectCards.forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
  
        const xPercent = x / rect.width
        const yPercent = y / rect.height
  
        const rotateX = (0.5 - yPercent) * 10
        const rotateY = (xPercent - 0.5) * 10
  
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
        card.style.transition = "transform 0.1s"
      })
  
      card.addEventListener("mouseleave", () => {
        card.style.transform = "perspective(1000px) rotateX(0) rotateY(0)"
        card.style.transition = "transform 0.5s"
      })
    })
  
    // Add parallax scrolling effect to sections
    window.addEventListener("scroll", () => {
      const parallaxElements = document.querySelectorAll(".parallax")
  
      parallaxElements.forEach((element) => {
        const scrollPosition = window.pageYOffset
        const speed = element.getAttribute("data-speed") || 0.5
  
        element.style.transform = `translateY(${scrollPosition * speed}px)`
      })
    })
  
    // Add futuristic cursor trail effect
    const cursorTrail = document.createElement("div")
    cursorTrail.className = "cursor-trail"
    document.body.appendChild(cursorTrail)
  
    const trailDots = []
    const trailDotsCount = 20
  
    for (let i = 0; i < trailDotsCount; i++) {
      const dot = document.createElement("div")
      dot.className = "trail-dot"
      cursorTrail.appendChild(dot)
      trailDots.push({
        element: dot,
        x: 0,
        y: 0,
      })
    }
  
    let mouseX = 0
    let mouseY = 0
  
    document.addEventListener("mousemove", (e) => {
      mouseX = e.clientX
      mouseY = e.clientY
    })
  
    function animateTrail() {
      let x = mouseX
      let y = mouseY
  
      trailDots.forEach((dot, index) => {
        const nextDot = trailDots[index + 1] || trailDots[0]
  
        dot.x = x
        dot.y = y
  
        dot.element.style.left = `${x}px`
        dot.element.style.top = `${y}px`
        dot.element.style.scale = 1 - index * 0.03
        dot.element.style.opacity = 1 - index * 0.04
  
        x += (nextDot.x - x) * 0.3
        y += (nextDot.y - y) * 0.3
      })
  
      requestAnimationFrame(animateTrail)
    }
  
    animateTrail()
  
    // Add glitch effect on hover for section titles
    const sectionTitles = document.querySelectorAll(".section-title h2")
  
    sectionTitles.forEach((title) => {
      title.addEventListener("mouseenter", () => {
        title.classList.add("glitch-effect")
      })
  
      title.addEventListener("mouseleave", () => {
        title.classList.remove("glitch-effect")
      })
    })
  
    // Create digital rain effect for hero section
    const createDigitalRain = () => {
      const digitalRain = document.createElement("div")
      digitalRain.className = "digital-rain"
      document.querySelector(".hero-section").appendChild(digitalRain)
  
      const characters = "01"
      const columnCount = Math.floor(window.innerWidth / 20)
  
      for (let i = 0; i < columnCount; i++) {
        const column = document.createElement("div")
        column.className = "rain-column"
        column.style.left = `${i * 20}px`
  
        const columnHeight = Math.random() * 20 + 10
        let columnContent = ""
  
        for (let j = 0; j < columnHeight; j++) {
          columnContent += characters.charAt(Math.floor(Math.random() * characters.length))
        }
  
        column.textContent = columnContent
        column.style.animationDuration = `${Math.random() * 10 + 10}s`
        column.style.animationDelay = `${Math.random() * 5}s`
  
        digitalRain.appendChild(column)
      }
    }
  
    createDigitalRain()
  
    // Create hero dots
    const createHeroDots = () => {
      const heroDots = document.querySelector(".hero-dots")
  
      for (let i = 0; i < 50; i++) {
        const dot = document.createElement("div")
        dot.className = "hero-dot"
        dot.style.left = `${Math.random() * 100}%`
        dot.style.top = `${Math.random() * 100}%`
        dot.style.animationDuration = `${Math.random() * 5 + 5}s`
        dot.style.animationDelay = `${Math.random() * 5}s`
  
        heroDots.appendChild(dot)
      }
    }
  
    createHeroDots()
  })
  
  