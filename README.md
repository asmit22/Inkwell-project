# 📚 Inkwell — Story Reading & Writing Platform

Inkwell is a full-stack web platform where users can **read, write, and explore stories** across multiple genres like fantasy, sci-fi, horror, romance, Hindi, and kids stories.

It’s designed to give writers a space to share their work while providing readers with a smooth and engaging storytelling experience.

---

## 🚀 Features

### ✍️ For Writers

* Submit original stories
* Track submission status (pending / approved / rejected)
* Write across multiple genres
* Profile with bio and identity

### 📖 For Readers

* Browse stories by genre
* Read only approved content
* Discover new and trending stories
* Clean and distraction-free reading experience

### 🛡️ Admin Controls

* Review submitted stories
* Approve or reject content
* Add feedback for writers
* Maintain content quality

---

## 🧠 Tech Stack

**Frontend**

* React / Next.js (depending on your setup)
* Tailwind CSS (if used)

**Backend**

* Node.js + Express

**Database & Auth**

* Supabase (PostgreSQL + Auth + RLS)

**Other Tools**

* Nodemon (development)
* OpenAI API (for content seeding, optional)

---

## 🗂️ Database Design (Simplified)

### Profiles

* Stores user data and roles (`writer`, `admin`)

### Stories

* Story content and metadata
* Status-based moderation system

### Genres (optional extension)

* Categorization of stories

---

## 🔐 Security (Row Level Security)

* Users can only edit their own profiles
* Writers can:

  * insert their own stories
  * view their own submissions
* Public users can:

  * only view approved stories
* Admins can:

  * update story status

---

## ⚙️ Getting Started

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd inkwell-project
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment variables

Create a `.env` file:

```env
SUPABASE_URL=your_url
SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
OPENAI_API_KEY=your_key (optional)
```

---

### 4. Run the backend

```bash
npm run dev
```

---

## 🧪 Content Pipeline (Pre-Launch)

To make the platform feel alive before real users:

* Generate initial stories (AI-assisted or manual)
* Store them as `pending_review`
* Review and approve manually
* Schedule publishing using `publish_at`
* Seed multiple authors for realism

---

## 📈 Future Improvements

* Recommendation system
* Likes, comments, bookmarks
* AI-based genre classification
* Personalized feed
* Audio stories
* Mobile app

---

## ⚠️ Notes

* Avoid publishing unreviewed AI-generated content
* Maintain quality over quantity
* Use moderation to build trust with users

---

## 👨‍💻 Author

Built by **Asmit**

---

## 📄 License

This project is open-source and available under the MIT License.
