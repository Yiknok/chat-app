const path = require('path')
const http = require('http')
const express = require ('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const port = process.env.PORT || 3000
const server = http.createServer(app)
const io = socketio(server)

const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

io.on('connection', (socket)=>{

    socket.on('join', (options,callback)=>{
        const {error, user} = addUser({id:socket.id, ...options})
        if(error){
            return callback(error)
        }


        socket.join(user.room)

        socket.emit('message', generateMessage('System message','Welcome'))
        socket.broadcast.to(user.room).emit('message', generateMessage( `${user.username} has joined!`))

        io.to(user.room).emit('roomData',{
            room:user.room,
            users:getUsersInRoom(user.room)
        })
    })

    socket.on('sendMessage', (message,callback)=>{
        const user = getUser(socket.id)

        const filter = new Filter()

        if(filter.isProfane(message)){
            return callback('Profanity msg is not allowed')
        }

        io.to(user.room).emit('message', generateMessage(user.username,message))
        callback()
    })
    socket.on('sendLocation', (coords, callback)=>{
       const user = getUser(socket.id)
    
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username,coords))
        callback()
    })
    socket.on('disconnect', ()=>{
        const user = removeUser(socket.id)
        if(user){
            io.to(user.room).emit('message', generateMessage(`${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room:user.room,
                users:getUsersInRoom(user.room)
            })
        }
    })
})

server.listen(port,()=>{
    console.log(`Server started on port ${port}`);
})