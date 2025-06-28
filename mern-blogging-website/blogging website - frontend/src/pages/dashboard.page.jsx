import React, { useState, useEffect } from 'react'
import { useAuth } from '../common/session'
import ManageBlogCard from '../components/manage-blogcard.component'
import Loader from '../components/loader.component'

const Dashboard = () => {
    const [blogs, setBlogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const { user } = useAuth()

    useEffect(() => {
        fetchUserBlogs()
    }, [])

    const fetchUserBlogs = async () => {
        try {
            setLoading(true)
            const response = await fetch(import.meta.env.VITE_SERVER_DOMAIN + '/user-written-blogs', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    page: 1,
                    draft: false,
                    query: ""
                })
            })
            
            if (response.ok) {
                const data = await response.json()
                setBlogs(data.blogs)
            } else {
                setError('Failed to load your stories')
            }
        } catch (error) {
            console.error('Error fetching blogs:', error)
            setError('Failed to load your stories')
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (blogId) => {
        try {
            const response = await fetch(import.meta.env.VITE_SERVER_DOMAIN + '/delete-blog', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    blogId: blogId
                })
            })
            
            if (response.ok) {
                setBlogs(blogs.filter(blog => blog.blog_id !== blogId))
            }
        } catch (error) {
            console.error('Error deleting blog:', error)
        }
    }

    const handleEdit = (blogId) => {
        window.location.href = `/editor/${blogId}`
    }

    const stats = {
        totalStories: blogs.length,
        totalViews: blogs.reduce((sum, blog) => sum + (blog.activity?.total_reads || 0), 0),
        totalLikes: blogs.reduce((sum, blog) => sum + (blog.activity?.total_likes || 0), 0),
        totalComments: blogs.reduce((sum, blog) => sum + (blog.activity?.total_comments || 0), 0)
    }

    if (loading) return <Loader />

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center py-8">
                        <p className="text-red-500 mb-2">{error}</p>
                        <button 
                            onClick={fetchUserBlogs}
                            className="text-blue-500 hover:text-blue-600"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-6xl mx-auto px-4">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
                    <p className="text-gray-600">Manage your Islamic stories and track their performance</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow-sm">
                        <div className="flex items-center">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <span className="text-2xl">📖</span>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm text-gray-600">Total Stories</p>
                                <p className="text-2xl font-bold text-gray-800">{stats.totalStories}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm">
                        <div className="flex items-center">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <span className="text-2xl">👁️</span>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm text-gray-600">Total Views</p>
                                <p className="text-2xl font-bold text-gray-800">{stats.totalViews}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm">
                        <div className="flex items-center">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <span className="text-2xl">❤️</span>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm text-gray-600">Total Likes</p>
                                <p className="text-2xl font-bold text-gray-800">{stats.totalLikes}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm">
                        <div className="flex items-center">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <span className="text-2xl">💬</span>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm text-gray-600">Total Comments</p>
                                <p className="text-2xl font-bold text-gray-800">{stats.totalComments}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stories Section */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-800">Your Stories</h2>
                        <a 
                            href="/editor"
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                            Write New Story
                        </a>
                    </div>

                    {blogs.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500 mb-4">You haven't published any stories yet</p>
                            <a 
                                href="/editor"
                                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                Write Your First Story
                            </a>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {blogs.map(blog => (
                                <ManageBlogCard 
                                    key={blog.blog_id}
                                    blog={blog}
                                    onDelete={handleDelete}
                                    onEdit={handleEdit}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Dashboard
