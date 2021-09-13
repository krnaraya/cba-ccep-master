const getIpAddress = () => {
    return new Promise((resolve) => {
        require('dns').lookup(require('os').hostname(),  (err, addr, fam) => {
            resolve(addr);
        });
    });
};

module.exports = {
    getIpAddress
};