// CI環境用のMongoDB接続モック

const mockDatabase = {
  posts: [
    {
      _id: '1',
      title: 'テスト投稿1',
      content: 'これはテスト用の投稿です。',
      author: 'テストユーザー',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
    {
      _id: '2', 
      title: 'テスト投稿2',
      content: 'これは2つ目のテスト用投稿です。',
      author: 'テストユーザー2',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02')
    }
  ]
};

export const mockMongoClient = {
  connect: () => Promise.resolve(),
  close: () => Promise.resolve(),
  db: () => ({
    collection: (name) => ({
      find: () => ({ toArray: () => Promise.resolve(mockDatabase[name] || []) }),
      findOne: (query) => {
        const data = mockDatabase[name] || [];
        if (query._id) {
          return Promise.resolve(data.find(item => item._id === query._id) || null);
        }
        return Promise.resolve(data[0] || null);
      },
      insertOne: (doc) => {
        const newDoc = { ...doc, _id: String(Date.now()) };
        mockDatabase[name] = [...(mockDatabase[name] || []), newDoc];
        return Promise.resolve({ insertedId: newDoc._id });
      },
      updateOne: (query, update) => {
        const data = mockDatabase[name] || [];
        const index = data.findIndex(item => item._id === query._id);
        if (index >= 0) {
          mockDatabase[name][index] = { ...data[index], ...update.$set };
        }
        return Promise.resolve({ modifiedCount: index >= 0 ? 1 : 0 });
      },
      deleteOne: (query) => {
        const data = mockDatabase[name] || [];
        const index = data.findIndex(item => item._id === query._id);
        if (index >= 0) {
          mockDatabase[name].splice(index, 1);
        }
        return Promise.resolve({ deletedCount: index >= 0 ? 1 : 0 });
      }
    })
  })
};

export default mockDatabase;