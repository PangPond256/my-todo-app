// Import modules
require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

const app = express();

// Config
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch((err) => console.error('❌ MongoDB error:', err));

// Helper functions
function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

function endOfFutureDays(days = 7) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(23, 59, 59, 999);
    return d;
}

// Mongoose Schemas
const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, trim: true, lowercase: true },
        password: { type: String, required: true },
        color: { type: String, default: 'bg-blue' }
    },
    { timestamps: true }
);

const categorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true, trim: true },
        color: { type: String, default: 'bg-blue' },
        icon: { type: String, default: 'folder' }
    },
    { timestamps: true }
);

const taskSchema = new mongoose.Schema(
    {
        userEmail: { type: String, required: true, index: true, trim: true, lowercase: true },
        title: { type: String, required: true, trim: true },
        description: { type: String, default: '' },
        status: {
            type: String,
            enum: ['pending', 'doing', 'done'],
            default: 'pending'
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'urgent'],
            default: 'medium'
        },
        dueDate: { type: Date, required: true },
        taggedUsers: [{ type: String, trim: true, lowercase: true }],
        categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
        categoryName: { type: String, default: '' }
    },
    { timestamps: true }
);

const workspaceMemberSchema = new mongoose.Schema(
    {
        ownerEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
        memberEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
        color: { type: String, default: 'bg-blue' }
    },
    { timestamps: true }
);

workspaceMemberSchema.index({ ownerEmail: 1, memberEmail: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);
const Category = mongoose.model('Category', categorySchema);
const Task = mongoose.model('Task', taskSchema);
const WorkspaceMember = mongoose.model('WorkspaceMember', workspaceMemberSchema);

// Page Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'login.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'dashboard.html'));
});

app.get('/tasks-page', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'tasks.html'));
});

app.get('/members-page', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'member.html'));
});

app.get('/categories-page', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'html', 'category.html'));
});

// Auth routes
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกข้อมูลให้ครบ'
            });
        }

        const normalizedEmail = normalizeEmail(email);
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'อีเมลนี้ถูกใช้งานแล้ว'
            });
        }

        const newUser = new User({
            name: String(name).trim(),
            email: normalizedEmail,
            password: String(password),
            color: 'bg-blue'
        });

        await newUser.save();

        await WorkspaceMember.updateOne(
            { ownerEmail: normalizedEmail, memberEmail: normalizedEmail },
            {
                $setOnInsert: {
                    ownerEmail: normalizedEmail,
                    memberEmail: normalizedEmail,
                    color: 'bg-blue'
                }
            },
            { upsert: true }
        );

        return res.json({
            success: true,
            message: 'สมัครสมาชิกสำเร็จ'
        });
    } catch (error) {
        console.error('Register error:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการสมัครสมาชิก'
        });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const Email = req.body.Email || req.body.email;
        const Password = req.body.Password || req.body.password;

        if (!Email || !Password) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกอีเมลและรหัสผ่าน'
            });
        }

        const normalizedEmail = normalizeEmail(Email);
        const user = await User.findOne({
            email: normalizedEmail,
            password: String(Password)
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
            });
        }

        await WorkspaceMember.updateOne(
            { ownerEmail: normalizedEmail, memberEmail: normalizedEmail },
            {
                $setOnInsert: {
                    ownerEmail: normalizedEmail,
                    memberEmail: normalizedEmail,
                    color: 'bg-blue'
                }
            },
            { upsert: true }
        );

        return res.json({
            success: true,
            user: {
                name: user.name,
                email: user.email,
                color: user.color
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์'
        });
    }
});

// User routes
app.get('/api/users/all', async (req, res) => {
    try {
        const users = await User.find({}, 'name email color').sort({ createdAt: -1 });
        return res.json(users);
    } catch (error) {
        console.error('Users error:', error);
        return res.status(500).json([]);
    }
});

app.get('/api/users/check', async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({
                exists: false,
                message: 'กรุณาระบุอีเมล'
            });
        }

        const user = await User.findOne(
            { email: normalizeEmail(email) },
            'name email'
        );

        if (!user) {
            return res.json({
                exists: false,
                message: 'ไม่พบผู้ใช้งานนี้ในระบบ'
            });
        }

        return res.json({
            exists: true,
            user
        });
    } catch (error) {
        console.error('User check error:', error);
        return res.status(500).json({
            exists: false,
            message: 'เกิดข้อผิดพลาด'
        });
    }
});

// Workspace member routes
app.get('/api/workspace-members', async (req, res) => {
    try {
        const ownerEmail = normalizeEmail(req.query.ownerEmail);

        if (!ownerEmail) {
            return res.status(400).json({
                success: false,
                members: [],
                message: 'กรุณาระบุ ownerEmail'
            });
        }

        const relations = await WorkspaceMember.find({ ownerEmail }).sort({ createdAt: 1 });
        const memberEmails = relations.map(item => item.memberEmail);

        const users = await User.find(
            { email: { $in: memberEmails } },
            'name email'
        );

        const userMap = new Map(users.map(user => [user.email, user]));

        const members = relations
            .map(rel => {
                const user = userMap.get(rel.memberEmail);
                if (!user) return null;

                return {
                    name: user.name,
                    email: user.email,
                    color: rel.color || 'bg-blue'
                };
            })
            .filter(Boolean);

        return res.json({
            success: true,
            members
        });
    } catch (error) {
        console.error('Get workspace members error:', error);
        return res.status(500).json({
            success: false,
            members: [],
            message: 'ไม่สามารถดึงสมาชิกในทีมได้'
        });
    }
});

app.post('/api/workspace-members', async (req, res) => {
    try {
        const { ownerEmail, email, color } = req.body;

        const normalizedOwner = normalizeEmail(ownerEmail);
        const normalizedMember = normalizeEmail(email);
        const selectedColor = color || 'bg-blue';

        if (!normalizedOwner || !normalizedMember) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุ ownerEmail และ email'
            });
        }

        const ownerUser = await User.findOne({ email: normalizedOwner }, 'name email');
        const memberUser = await User.findOne({ email: normalizedMember }, 'name email');

        if (!ownerUser) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบเจ้าของทีมในระบบ'
            });
        }

        if (!memberUser) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบผู้ใช้นี้ในระบบ กรุณาให้เขาสมัครก่อน'
            });
        }

        const exists = await WorkspaceMember.findOne({
            ownerEmail: normalizedOwner,
            memberEmail: normalizedMember
        });

        if (exists) {
            return res.status(409).json({
                success: false,
                message: 'สมาชิกคนนี้อยู่ในทีมแล้ว'
            });
        }

        await WorkspaceMember.updateOne(
            { ownerEmail: normalizedOwner, memberEmail: normalizedOwner },
            {
                $setOnInsert: {
                    ownerEmail: normalizedOwner,
                    memberEmail: normalizedOwner,
                    color: 'bg-blue'
                }
            },
            { upsert: true }
        );

        await WorkspaceMember.updateOne(
            { ownerEmail: normalizedMember, memberEmail: normalizedMember },
            {
                $setOnInsert: {
                    ownerEmail: normalizedMember,
                    memberEmail: normalizedMember,
                    color: 'bg-blue'
                }
            },
            { upsert: true }
        );

        await WorkspaceMember.create([
            {
                ownerEmail: normalizedOwner,
                memberEmail: normalizedMember,
                color: selectedColor
            },
            {
                ownerEmail: normalizedMember,
                memberEmail: normalizedOwner,
                color: selectedColor
            }
        ]);

        return res.json({
            success: true,
            member: {
                name: memberUser.name,
                email: memberUser.email,
                color: selectedColor
            }
        });
    } catch (error) {
        console.error('Add workspace member error:', error);
        return res.status(500).json({
            success: false,
            message: 'ไม่สามารถเพิ่มสมาชิกเข้าทีมได้'
        });
    }
});

app.patch('/api/workspace-members/color', async (req, res) => {
    try {
        const { ownerEmail, memberEmail, color } = req.body;

        const normalizedOwner = normalizeEmail(ownerEmail);
        const normalizedMember = normalizeEmail(memberEmail);

        if (!normalizedOwner || !normalizedMember || !color) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุ ownerEmail, memberEmail และ color'
            });
        }

        const updated = await WorkspaceMember.findOneAndUpdate(
            { ownerEmail: normalizedOwner, memberEmail: normalizedMember },
            { color },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบสมาชิกในทีม'
            });
        }

        return res.json({
            success: true,
            relation: updated
        });
    } catch (error) {
        console.error('Update workspace member color error:', error);
        return res.status(500).json({
            success: false,
            message: 'ไม่สามารถเปลี่ยนสีสมาชิกได้'
        });
    }
});

app.delete('/api/workspace-members', async (req, res) => {
    try {
        const { ownerEmail, memberEmail } = req.body;

        const normalizedOwner = normalizeEmail(ownerEmail);
        const normalizedMember = normalizeEmail(memberEmail);

        if (!normalizedOwner || !normalizedMember) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุ ownerEmail และ memberEmail'
            });
        }

        if (normalizedOwner === normalizedMember) {
            return res.status(400).json({
                success: false,
                message: 'ไม่สามารถลบเจ้าของทีมออกจากทีมตัวเองได้'
            });
        }

        await WorkspaceMember.deleteMany({
            $or: [
                { ownerEmail: normalizedOwner, memberEmail: normalizedMember },
                { ownerEmail: normalizedMember, memberEmail: normalizedOwner }
            ]
        });

        return res.json({
            success: true,
            message: 'ลบสมาชิกออกจากทีมสำเร็จ'
        });
    } catch (error) {
        console.error('Delete workspace member error:', error);
        return res.status(500).json({
            success: false,
            message: 'ไม่สามารถลบสมาชิกออกจากทีมได้'
        });
    }
});

// Category routes
app.get('/api/categories/all', async (req, res) => {
    try {
        const categories = await Category.find().sort({ createdAt: -1 });
        return res.json(categories);
    } catch (error) {
        console.error('Get categories error:', error);
        return res.status(500).json([]);
    }
});

app.post('/api/categories', async (req, res) => {
    try {
        const { name, color, icon } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกชื่อหมวดหมู่'
            });
        }

        const exists = await Category.findOne({ name: String(name).trim() });
        if (exists) {
            return res.status(409).json({
                success: false,
                message: 'มีหมวดหมู่นี้แล้ว'
            });
        }

        const category = new Category({
            name: String(name).trim(),
            color: color || 'bg-blue',
            icon: icon || 'folder'
        });

        await category.save();

        return res.json({
            success: true,
            category
        });
    } catch (error) {
        console.error('Create category error:', error);
        return res.status(500).json({
            success: false,
            message: 'สร้างหมวดหมู่ไม่สำเร็จ'
        });
    }
});

app.put('/api/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, color, icon } = req.body;

        const updated = await Category.findByIdAndUpdate(
            id,
            {
                ...(name ? { name: String(name).trim() } : {}),
                ...(color ? { color } : {}),
                ...(icon ? { icon } : {})
            },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบหมวดหมู่'
            });
        }

        return res.json({
            success: true,
            category: updated
        });
    } catch (error) {
        console.error('Update category error:', error);
        return res.status(500).json({
            success: false,
            message: 'แก้ไขหมวดหมู่ไม่สำเร็จ'
        });
    }
});

app.delete('/api/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await Category.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบหมวดหมู่'
            });
        }

        return res.json({
            success: true,
            message: 'ลบหมวดหมู่สำเร็จ'
        });
    } catch (error) {
        console.error('Delete category error:', error);
        return res.status(500).json({
            success: false,
            message: 'ลบหมวดหมู่ไม่สำเร็จ'
        });
    }
});

// Task routes
app.post('/api/tasks', async (req, res) => {
    try {
        const {
            userEmail,
            title,
            description,
            status,
            priority,
            dueDate,
            taggedUsers,
            categoryId,
            categoryName
        } = req.body;

        if (!userEmail || !title || !dueDate) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกข้อมูลให้ครบ'
            });
        }

        const task = new Task({
            userEmail: normalizeEmail(userEmail),
            title: String(title).trim(),
            description: description || '',
            status: status || 'pending',
            priority: priority || 'medium',
            dueDate: new Date(dueDate),
            taggedUsers: Array.isArray(taggedUsers)
                ? taggedUsers.map((u) => normalizeEmail(u))
                : [],
            categoryId: categoryId || null,
            categoryName: categoryName || ''
        });

        await task.save();

        return res.json({
            success: true,
            task
        });
    } catch (error) {
        console.error('Create task error:', error);
        return res.status(500).json({
            success: false,
            message: 'บันทึกงานไม่สำเร็จ'
        });
    }
});

app.get('/api/tasks', async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({
                success: false,
                tasks: [],
                message: 'กรุณาระบุอีเมล'
            });
        }

        const normalizedEmail = normalizeEmail(email);

        const tasks = await Task.find({
            $or: [
                { userEmail: normalizedEmail },
                { taggedUsers: normalizedEmail }
            ]
        }).sort({ createdAt: -1 });

        return res.json({
            success: true,
            tasks
        });
    } catch (error) {
        console.error('Get tasks error:', error);
        return res.status(500).json({
            success: false,
            tasks: []
        });
    }
});

app.get('/api/tasks/upcoming', async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({
                success: false,
                tasks: []
            });
        }

        const normalizedEmail = normalizeEmail(email);
        const today = startOfToday();
        const upcomingEnd = endOfFutureDays(7);

        const tasks = await Task.find({
            $or: [
                { userEmail: normalizedEmail },
                { taggedUsers: normalizedEmail }
            ],
            dueDate: { $gte: today, $lte: upcomingEnd },
            status: { $ne: 'done' }
        }).sort({ dueDate: 1 });

        return res.json({
            success: true,
            tasks
        });
    } catch (error) {
        console.error('Upcoming tasks error:', error);
        return res.status(500).json({
            success: false,
            tasks: []
        });
    }
});

app.get('/api/tasks/overdue', async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({
                success: false,
                tasks: []
            });
        }

        const normalizedEmail = normalizeEmail(email);
        const today = startOfToday();

        const tasks = await Task.find({
            $or: [
                { userEmail: normalizedEmail },
                { taggedUsers: normalizedEmail }
            ],
            dueDate: { $lt: today },
            status: { $ne: 'done' }
        }).sort({ dueDate: 1 });

        return res.json({
            success: true,
            tasks
        });
    } catch (error) {
        console.error('Overdue tasks error:', error);
        return res.status(500).json({
            success: false,
            tasks: []
        });
    }
});

app.get('/api/stats', async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({
                success: false,
                stats: { total: 0, pending: 0, doing: 0, done: 0 }
            });
        }

        const normalizedEmail = normalizeEmail(email);
        const query = {
            $or: [
                { userEmail: normalizedEmail },
                { taggedUsers: normalizedEmail }
            ]
        };

        const [total, pending, doing, done] = await Promise.all([
            Task.countDocuments(query),
            Task.countDocuments({ ...query, status: 'pending' }),
            Task.countDocuments({ ...query, status: 'doing' }),
            Task.countDocuments({ ...query, status: 'done' })
        ]);

        return res.json({
            success: true,
            stats: { total, pending, doing, done }
        });
    } catch (error) {
        console.error('Stats error:', error);
        return res.status(500).json({
            success: false,
            stats: { total: 0, pending: 0, doing: 0, done: 0 }
        });
    }
});

app.patch('/api/tasks/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, requesterEmail } = req.body;

        if (!requesterEmail) {
            return res.status(400).json({
                success: false,
                message: 'ไม่พบผู้ใช้งาน'
            });
        }

        if (!['pending', 'doing', 'done'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'สถานะไม่ถูกต้อง'
            });
        }

        const normalizedEmail = normalizeEmail(requesterEmail);
        const task = await Task.findById(id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบงาน'
            });
        }

        if (task.userEmail !== normalizedEmail) {
            return res.status(403).json({
                success: false,
                message: 'เฉพาะเจ้าของงานเท่านั้นที่เปลี่ยนสถานะได้'
            });
        }

        task.status = status;
        await task.save();

        return res.json({
            success: true,
            task
        });
    } catch (error) {
        console.error('Update task status error:', error);
        return res.status(500).json({
            success: false,
            message: 'อัปเดตสถานะไม่สำเร็จ'
        });
    }
});

app.put('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            requesterEmail,
            title,
            description,
            status,
            priority,
            dueDate,
            taggedUsers,
            categoryId,
            categoryName
        } = req.body;

        if (!requesterEmail) {
            return res.status(400).json({
                success: false,
                message: 'ไม่พบผู้ใช้งาน'
            });
        }

        const normalizedEmail = normalizeEmail(requesterEmail);
        const task = await Task.findById(id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบงาน'
            });
        }

        if (task.userEmail !== normalizedEmail) {
            return res.status(403).json({
                success: false,
                message: 'เฉพาะเจ้าของงานเท่านั้นที่แก้ไขงานได้'
            });
        }

        if (title !== undefined) task.title = String(title).trim();
        if (description !== undefined) task.description = description;
        if (status !== undefined && ['pending', 'doing', 'done'].includes(status)) {
            task.status = status;
        }
        if (priority !== undefined && ['low', 'medium', 'high', 'urgent'].includes(priority)) {
            task.priority = priority;
        }
        if (dueDate !== undefined) task.dueDate = new Date(dueDate);
        if (taggedUsers !== undefined && Array.isArray(taggedUsers)) {
            task.taggedUsers = taggedUsers.map((u) => normalizeEmail(u));
        }
        if (categoryId !== undefined) task.categoryId = categoryId || null;
        if (categoryName !== undefined) task.categoryName = categoryName || '';

        await task.save();

        return res.json({
            success: true,
            task
        });
    } catch (error) {
        console.error('Update task error:', error);
        return res.status(500).json({
            success: false,
            message: 'แก้ไขงานไม่สำเร็จ'
        });
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { requesterEmail } = req.body;

        if (!requesterEmail) {
            return res.status(400).json({
                success: false,
                message: 'ไม่พบผู้ใช้งาน'
            });
        }

        const normalizedEmail = normalizeEmail(requesterEmail);
        const task = await Task.findById(id);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบงาน'
            });
        }

        if (task.userEmail !== normalizedEmail) {
            return res.status(403).json({
                success: false,
                message: 'เฉพาะเจ้าของงานเท่านั้นที่ลบงานได้'
            });
        }

        await Task.findByIdAndDelete(id);

        return res.json({
            success: true,
            message: 'ลบงานสำเร็จ'
        });
    } catch (error) {
        console.error('Delete task error:', error);
        return res.status(500).json({
            success: false,
            message: 'ลบงานไม่สำเร็จ'
        });
    }
});

// API fallback
app.use('/api', (req, res) => {
    return res.status(404).json({
        success: false,
        message: 'API not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});