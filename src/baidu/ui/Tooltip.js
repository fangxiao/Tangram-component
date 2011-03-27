/**
 * Tangram
 * Copyright 2009 Baidu Inc. All rights reserved.
 */

///import baidu.ui.createUI;
///import baidu.ui.behavior.posable.setPositionByElement;
///import baidu.ui.behavior.posable.setPositionByMouse;

///import baidu.object.extend;
///import baidu.dom.g;
///import baidu.dom.setStyles;
///import baidu.dom.remove;
///import baidu.string.format;
///import baidu.dom.insertHTML;
///import baidu.lang.toArray;
///import baidu.dom.children;
///import baidu.object.each;
///import baidu.array.each;
///import baidu.dom.getAttr;
///import baidu.dom.setAttr;

 /**
 * 弹出tip层,类似鼠标划过含title属性元素的效果
 * @class
 * @param       {Object}          options         选项.
 * @config      {Element}         contentElement  Tooltip元素的内部HTMLElement。
 * @config      {String}          content     Tooltip元素的内部HTML String。若target存在title，则以title为准
 * @config      {String}          width           宽度
 * @config      {String}          height          高度
 * @config      {Array|Object}    offset          偏移量。若为数组，索引0为x方向，索引1为y方向；若为Object，键x为x方向，键y为y方向。单位：px，默认值：[0,0]。
 * @config      {boolean}         single          是否全局单例。若该值为true，则全局共用唯一的浮起tooltip元素，默认为true。
 * @config      {Number}          zIndex          浮起tooltip层的z-index值，默认为3000。
 * @config      {String}          positionBy      浮起tooltip层的位置参考，取值['mouse','element']，分别对应针对鼠标位置或者element元素计算偏移，默认mouse。
 * @config      {Function}        onopen          打开tooltip时触发。
 * @config      {Function}        onclose         关闭tooltip时触发。
 * @config      {Function}        onbeforeopen    打开tooltip前触发。
 * @config      {Function}        onbeforeclose   关闭tooltip前触发。
 * @config      {Number}          showDelay       触发显示的延迟，默认为100毫秒。
 * @config      {Number}          hideDelay       触发隐藏的延迟，默认为500毫秒。
 * @plugin      fx                Tooltip的展现和消失效果支持。
 * @return     {baidu.ui.Tooltip}        Tooltip实例
 */

baidu.ui.Tooltip = baidu.ui.createUI(function(options) {
    
    var me = this;
    me.target = me.getTarget();
    me.offset = options.offset || [0, 0];

    baidu.ui.Tooltip._showingTooltip[me.guid] = me;

}).extend(
    /**
     *  @lends baidu.ui.Tooltip.prototype
     */
{
    uiType: 'tooltip',

    width: '',
    height: '',
    zIndex: 3000,
    currentTarget: null,

    type: 'click',

    posable: true,
    positionBy: 'element',
	offsetPosition: 'bottomright',

    isShowing: false,

    tplBody: '<div id="#{id}" class="#{class}"></div>',

    /**
     * 获取Tooltip的HTML字符串
     * @private
     * @return {String} TooltipHtml
     */
    getString: function() {
		var me = this;
		return baidu.format(me.tplBody, {
			id: me.getId(),
			'class' : me.getClass()
		});
	},

    /**
	 * 开关函数,返回false时不显示
     * @private
     */
	toggle: function() {return true},
    
    /**
     * 渲染Tooltip到HTML
     * @public 
     * @param {String|HTMLElement} element  需要渲染到的元素或者id.
     * @return {Null}
     */
    render: function(element) {
        var me = this,
            main,title;

        main = me.renderMain(element);

        baidu.each(me.target, function(t,index){
            if((title = baidu.getAttr(t, 'title')) && title != ''){
                baidu.setAttr(t, 'tangram-tooltip-title', title);
                baidu.setAttr(t, 'title', '');
            }
        });
        baidu.dom.insertHTML(main,"beforeend",me.getString());
        me._update();
        me._close();
        
        me.dispatchEvent('onload');
    },

	/**
	 * 打开tooltip
	 * @public
     * @param {HTMLElement} target 显示tooltip所参照的html元素
     * @return {Null}
	 */
	open: function(target) {
		var me = this,
            showTooltip = baidu.ui.Tooltip._showingTooltip,
            isSingleton = baidu.ui.Tooltip.isSingleton,
            target = target || me.target[0],
            currentTarget = me.currentTarget,
            body = me.getBody();

         //判断是否为当前打开tooltip的target
         //若是，则直接返回
        if(currentTarget === target) return;
        
        //若target为本组中之一，则关闭当前current
        me.isShowing && me.close(currentTarget);

        //查看当前tooltip全局设置,若为单例，关闭当前打开的tooltip
        if(isSingleton){
            baidu.object.each(showTooltip,function(tooltip,key){
                if(key != me.guid && tooltip.isShowing){
                    tooltip.close(); 
                } 
            });
        }

        //若toggle函数返回false，则直接返回
        if (typeof me.toggle == 'function' && !me.toggle()) return;

        me.currentTarget = target;

        if(!me.contentElement && !me.content){
            if((title = baidu.getAttr(me.currentTarget, 'tangram-tooltip-title')) && title != ''){
                body.innerHTML = title;
            }else{
                body.innerHTML = '';
            }
        }

        me._setPosition();
        me.isShowing = true;
        
        //若onbeforeopen事件返回值为false，则直接返回
        if (me.dispatchEvent('onbeforeopen')){
            me.dispatchEvent('open');
            return;
        }
	},

    _updateBody: function(options){
        var me = this,
            options = options || {},
            body = me.getBody(),
            title;

        if(me.contentElement && me.contentElement != body.firstChlid){
            //若存在me.content 并且该content和content里面的firstChlid不一样
            body.innerHTML = '';
            body.appendChild(me.contentElement);
        }else if(options.contentElement && me.contentElement != options.contentElement){
            //若options.content存在，则认为用户向对content进行更新
            //判断时候和原有content相同，不同则进行更新
            body.innerHTML = '';
            body.appendChild(options.contentElement);
        }else if(options.content && me.content != options.content){
            //若存在options.contentText，则认为用户相对contentText进行更新
            //判断是否和原有contenText相同，不同则进行更新（包括原本不存在contentText）
            body.innerHTML = options.content;
        }else if(me.content && baidu.dom.children(body).length == 0 ) {
            //第一次new Tooltip时传入contentText，进行渲染
            body.innerHTML = me.content;
        }

    },
	
    /**
     * 更新tooltip属性值
     * @private
     * @param {Object} options 属性集合
     * @return {Null}
     */
    _update: function(options){
        var me = this,
            options = options || {},
            main = me.getMain();

        me._updateBody(options);
        baidu.object.extend(me, options);

        //更新寛高数据
        baidu.dom.setStyles(main, {
            zIndex: me.zIndex,
            width: me.width,
            height: me.height,
            // 防止插件更改display属性,比如fx.
            display: ''
        });
    },
    
    /**
     * 更新options
     * @public
     * @param       {object}          options         选项.
     * @config      {Element}         content         Tooltip元素的内部html。当指定target时，默认为target的title属性，否则默认为空。
     * @config      {String}          width           宽度
     * @config      {String}          height          高度
     * @config      {Array|Object}    offset          偏移量。若为数组，索引0为x方向，索引1为y方向；若为Object，键x为x方向，键y为y方向。单位：px，默认值：[0,0]。
     * @config      {boolean}         single          是否全局单例。若该值为true，则全局共用唯一的浮起tooltip元素，默认为true。
     * @config      {Number}          zIndex          浮起tooltip层的z-index值，默认为3000。
     * @config      {String}          positionBy      浮起tooltip层的位置参考，取值['mouse','element']，分别对应针对鼠标位置或者element元素计算偏移，默认mouse。
     * @config      {Function}        onopen          打开tooltip时触发。
     * @config      {Function}        onclose         关闭tooltip时触发。
     * @config      {Function}        onbeforeopen    打开tooltip前触发。
     * @config      {Function}        onbeforeclose   关闭tooltip前触发。
     * @config      {Number}          showDelay       触发显示的延迟，默认为100毫秒。
     * @config      {Number}          hideDelay       触发隐藏的延迟，默认为500毫秒。
     */
    update: function(options){
        var me = this;
        me._update(options);
        me._setPosition();
        me.dispatchEvent('onupdate');
    },

    /**
     * 设置position
     * @private
     * @return {Null}
     */
	_setPosition: function() {
		var me = this,
			positionOptions = {
				once: true,
				offset: me.offset,
				position: me.offsetPosition,
				insideScreen: 'surround'
			};
		switch (me.positionBy) {
			case 'element':
				me.setPositionByElement(me.currentTarget, me.getMain(), positionOptions);
				break;
			case 'mouse':
				me.setPositionByMouse(me.currentTarget, positionOptions);
				break;
			default :
				break;
		}
	},

	/**
	 * 关闭tooltip
	 * @public
     * @return {Null}
	 */
	close: function() {
		var me = this;

        if(!me.isShowing) return;
        
        me.isShowing = false;
        if(me.dispatchEvent('onbeforeclose')){
            me._close();
            me.dispatchEvent('onclose');
        }
        me.currentTarget = null;
    },


    _close: function() {
        var me = this;
                
        me.getMain().style.left = '-100000px';
    },
	/**
	 * 销毁控件
	 * @public
	 */
	dispose: function() {
		var me = this;
		me.dispatchEvent('ondispose');
		if (me.getBody()) {
			baidu.dom.remove(me.getBody());
		}
        delete(baidu.ui.Tooltip._showingTooltip[me.guid]);
		baidu.lang.Class.prototype.dispose.call(me);
	},
    /**
     * 获取target元素
	 * @private
	 */
    getTarget: function() {
        var me = this,
            target = [];
            
        baidu.each(baidu.lang.toArray(me.target),function(item){
            target.push(baidu.G(item));
        });

        return target;
    }
});

baidu.ui.Tooltip.isSingleton = false;
baidu.ui.Tooltip._showingTooltip = {};
