My Todo App
    A personal full-stack web application for managing tasks and collaborating with team members.
  This project was developed individually as a practice project to learn full-stack development, including backend APIs, database integration, and cloud deployment.

Live Demo
  - https://my-todo-app-fdur.onrender.com

Project Goal
  - The goal of this project is to practice building a complete web application from frontend to backend, including:
  - Designing a database
  - Creating REST APIs
  - Connecting frontend with backend
  - Deploying a web application to the cloud

Technologies Used
  - Frontend
  - HTML
  - CSS
  - JavaScript
  - Chart.js
  - Backend
  - Node.js
  - Express.js
  - Database
  - MongoDB Atlas
  - Mongoose
  - Deployment
  - Render
  - Version Control
  - Git
  - GitHub

Features
  User System
  - User registration
  - User login
  - User profile display
  Example accounts for testing:
    Email: pangpond1@gmail.com
    Password: za0887824455
    Email: test@gmail.com
    Password: 123456
  Users can also create their own account using the register page.

Task Management
  - Create tasks
  - Edit tasks
  - Set task priority
  - Set due dates
  - Assign categories to tasks
  Users can tag other members in tasks.

To tag a user:
  - The user must exist in the system database
  - Members can be added through the Manage Members page
When adding members:
  - Name and color can be customized
  - Email must already exist in the database
  - If the email does not exist, the system will show an alert that the user is not found

Task Permission
  In the All Tasks page:
  - Only the task creator can change the task status (Pending / Doing / Done)
  - Other users can view the task but cannot modify its status

Category Management
  Users can create task categories by selecting:
  - Category name
  - Category icon
  - Category color
  Categories help organize tasks and can be assigned when creating a task.

Dashboard
  The dashboard provides a summary of tasks including:
  - Total tasks
  - Pending tasks
  - Tasks in progress
  - Completed tasks
  - Task priority chart
  - Task status chart
  - Upcoming tasks
  - Overdue tasks
  This helps users quickly understand their overall task progress.
