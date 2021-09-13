var baseUrl = '';
// var baseUrl = 'http://localhost:3000';

var REST_STATUS = {
    SUCCESS: 'success'
};

function generateListItem(content, value, isActive) {
    if (isActive) {
        return '<li class="list-group-item active" data="' + value + '">' + 
                '<div class="md-v-line"></div>' +
                content + '</li>';
    } else {
        return '<li class="list-group-item" data="' + value + '">' + 
                '<div class="md-v-line"></div>' +
                content + '</li>';
    }
}

function updateMessage(msg) {
    $('.card-body').html(msg);
}

$(document).ready(function() {
    var activeStandardId = null;
    
    $.get(baseUrl + '/report-scc/standards', function(data, status) {
        if (status === REST_STATUS.SUCCESS) {
            for (var i = 0; i < data.standards.length; i++) {
                $('#standards .list-group')
                    .append(generateListItem(
                        data.standards[i].name, 
                        data.standards[i].id,
                        i === 0
                    ));
                    if (i === 0) {
                        activeStandardId = data.standards[i].id;
                    }
            }

            $('.list-group-item').click(function() {
                $('.list-group-item.active').removeClass('active');
                $(this).addClass('active');
                activeStandardId = $(this).attr('data');
            });
        }
    });

    function clearProgress() {
        $('.progress-bar.progress-bar-striped')
                    .removeClass('progress-bar-animated')
                    .css('width', '0%');
    }


    $('#main .btn.btn-primary').click(function() {
        if (activeStandardId) {
            $('.progress-bar.progress-bar-striped')
                .addClass('progress-bar-animated')
                .css('width', '100%');

            updateMessage('Flying................................');

            $.post(baseUrl + '/report-scc/scan', { 
                standardId: activeStandardId
            }, function(data, status) {
                console.log('sccPayload', data.sccPayload);
                if (status === REST_STATUS.SUCCESS &&
                     data.sccResponse.message) {
                    updateMessage(data.sccResponse.message);
                }
                clearProgress();
            }).fail(function(errResponse) {
                console.log(errResponse, '===');
                try {
                    updateMessage(JSON.parse(errResponse.responseText).message);
                } catch(err) {
                    updateMessage(errResponse.responseText)
                }
                
                clearProgress();
            });
        }
    });
});